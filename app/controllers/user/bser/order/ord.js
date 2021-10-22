let Err = require('../../aaIndex/err');
let Conf = require('../../../../../conf');
let SaveOrderPre = require('../../../../middle/saveOrderPre');

let moment = require('moment')

let Order = require('../../../../models/client/order');
let Ordfir = require('../../../../models/client/ordfir');
let Ordsec = require('../../../../models/client/ordsec');
let Ordthd = require('../../../../models/client/ordthd');

let Pdfir = require('../../../../models/material/pdfir');

exports.bsOrds = function(req, res) {
	let crUser = req.session.crUser;

	/* ---------- 排序 ------------- */
	let sortCond = "ctAt";
	let sortVal = -1;
	if(req.query.sortCond == "upAt"){
		sortCond = "upAt";
	}
	if(req.query.sortVal == 1){
		sortVal = 1;
	}
	/* ---------- 排序 ------------- */

	Order.find({
		'firm': crUser.firm,
		'status': { '$in': [0, 5]},
	})
	.populate('cter', 'nome')
	.populate({path: 'ordfirs', populate: [
		{path: 'pdfir'},
		{path: 'ordsecs', populate: [
			{path: 'pdsec', populate: {path: 'pdthds'}},
			{path: 'ordthds', populate: {
				path: 'pdthd', populate: [
					{path: 'ordthds'},
					{path: 'macthds'},
					{path: 'tinthds'},
				]}
			}
		]}
	]})
	.sort({[sortCond]: sortVal})
	.exec(function(err, orders) {
		if(err) {
			info = "bsOrders, User.find, Error";
			Err.usError(req, res, info);
		} else {
			res.render('./user/bser/order/order5', {
				title   : '订单',
				crUser  : crUser,
				orders  : orders,

				sortCond: sortCond,
				sortVal : sortVal,
			});
		}
	})
}

exports.bsOrdHis = function(req, res) {
	let crUser = req.session.crUser;

	let symAtFm = "$gte";
	let symAtTo = "$lte";
	let condAtTo = new Date(new Date().setHours(23, 59, 59, 0))
	let condAtFm = (condAtTo - Conf.hisDays*24*60*60*1000)
	if(req.query.atFm && req.query.atFm.length == 10){
		symAtFm = "$gte";   // $ ne eq gte gt lte lt
		condAtFm = new Date(req.query.atFm).setHours(0,0,0,0);
	}
	if(req.query.atTo && req.query.atTo.length == 10){
		symAtTo = "$lte";
		condAtTo = new Date(req.query.atTo).setHours(23,59,59,0);
	}

	/* ---------- 排序 ------------- */
	let sortCond = "ctAt";
	let sortVal = -1;
	if(req.query.sortCond == "fnAt"){
		sortCond = "fnAt";
	}
	if(req.query.sortVal == 1){
		sortVal = 1;
	}
	/* ---------- 排序 ------------- */
	
	Order.find({
		'firm': crUser.firm,
		'status': 10,
		'ctAt': {[symAtFm]: condAtFm, [symAtTo]: condAtTo}
	})
	.populate('cter', 'nome')
	.populate({path: 'ordfirs', populate: [
		{path: 'pdfir'},
		{path: 'ordsecs', populate: [
			{path: 'pdsec'},
			{path: 'ordthds', populate: {path: 'pdthd'}},
		]}
	]})
	.sort({"status": 1, [sortCond]: sortVal})
	.exec(function(err, orders) {
		if(err) {
			info = "bser order his, User.find, Error";
			Err.usError(req, res, info);
		} else {
			// console.log(orders.length)
			res.render('./user/bser/order/order10', {
				title : '订单记录',
				crUser: crUser,
				orders: orders,

				atFm  : condAtFm,
				atTo  : condAtTo,
				sortCond: sortCond,
				sortVal : sortVal,
			});
		}
	})
}

exports.bsOrderIfSendAjax = function(req, res) {
	let crUser = req.session.crUser;
	let obj = req.body.obj;
	let thds = obj.thds;
	let ords = new Array();
	let ordthdIds = new Array();
	for(let i in thds) {
		if(thds[i].shiping > 0) {
			ords.push(thds[i]);
			ordthdIds.push(thds[i].ordthdId);
		}
	}
	// console.log(ordthdIds)
	Ordthd.find({_id: ordthdIds})
	.populate({path: 'pdthd', populate: [
		{path: 'ordthds'}, {path: 'macthds'}, {path: 'tinthds'},
	]})
	.exec(function(err, ordthds) {
		if(err) {
			res.json({success: 0, info: "bser bsOrderIfSendAjax, Error!"})
		} else {
			let info = null;
			for(let i=0; i<ordthds.length; i++){
				/* ======================== 获取库存数量 ========================*/
				let pdthd = ordthds[i].pdthd;
				let quotOthd = shipOthd = lessOthd = 0;
				let quotMthd = shipMthd = lessMthd = 0;
				let quotTthd = shipTthd = lessTthd = 0;
				for(let m=0; m<pdthd.ordthds.length; m++) {
					let ordthd = pdthd.ordthds[m];
					let quot = parseInt(ordthd.quot);
					let ship = parseInt(ordthd.ship);
					quotOthd += quot; shipOthd += ship;
					if(quot - ship > 0) {
						lessOthd += (quot - ship)
					}
				}
				for(let m=0; m<pdthd.macthds.length; m++) {
					let macthd = pdthd.macthds[m];
					let quot = parseInt(macthd.quot);
					let ship = parseInt(macthd.ship);
					quotMthd += quot; shipMthd += ship;
					if(quot - ship > 0) {
						lessMthd += (quot - ship)
					}
				}
				for(let m=0; m<pdthd.tinthds.length; m++) {
					let tinthd = pdthd.tinthds[m];
					let quot = parseInt(tinthd.quot);
					let ship = parseInt(tinthd.ship);
					quotTthd += quot; shipTthd += ship;
					if(quot - ship > 0) {
						lessTthd += (quot - ship)
					}
				}
				let showThdStock = parseInt(pdthd.stock) + shipTthd + shipMthd - shipOthd;
				/* ======================== 获取库存数量 ========================*/

				let shiping = 0, shiped = 0, stock = 0;
				for(let k=0; k<ords.length; k++) {
					if(String(ords[k].ordthdId) == String(ordthds[i]._id)) {
						shiping = ords[k].shiping;
						shiped = ords[k].shiped;
						stock = ords[k].stock;
					}
				}
				if(shiped != ordthds[i].ship) {
					info = "请求超时， 请刷新页面，重新发货";
					break;
				} else if(showThdStock != stock) {
					info = "请求超时， 请刷新页面，重新发货";
					break;
				} else if(shiping > showThdStock) {
					info = "请求超时， 请刷新页面，重新发货";
					break;
				}
			}
			if(info) {
				res.json({success: 0, info: info})
			} else {
				res.json({success: 1})
			}
		}
	})
	// bsOrdthdIfSend(req, res, obj.orderId, ords, 0)
}

exports.bsOrderSend = function(req, res) {
	let crUser = req.session.crUser;
	let obj = req.body.obj;
	let thds = obj.thds;
	let ords = new Array();
	for(i in thds) {
		if(thds[i].shiping > 0) {
			ords.push(thds[i])
		}
	}
	
	bsOrdthdSend(req, res, obj.orderId, ords, 0)
}
let bsOrdthdSend = function(req, res, orderId, ords, n) {
	if(n == ords.length) {
		bsorderSend(req, res, orderId);
	} else {
		let ord = ords[n];
		let shiping = parseInt(ord.shiping);
		let ordthdId = ord.ordthdId;
		Ordthd.findOne({_id: ordthdId})
		.populate('pdthd')
		.exec(function(err, ordthd) {
			if(err) console.log(err);
			let pdthd = ordthd.pdthd;
			ordthd.ship = parseInt(ordthd.ship) + shiping;
			ordthd.save(function(err, ordthdSave) {
				if(err) console.log(err);
				pdthd.save(function(err, pdthdSave) {
					if(err) console.log(err);
					bsOrdthdSend(req, res, orderId, ords, n+1);
				})
			})
		})
	}
}
let bsorderSend = function(req, res, orderId) {
	Order.findOne({_id: orderId}, function(err, order) {
		if(err) {
			console.log(err);
			info = "bser orderSend, Order.findOne, Error";
			Err.usError(req, res, info);
		} else if(!order) {
			info = "bser orderSend, !order, Error";
			Err.usError(req, res, info);
		} else {
			order.save(function(err, orderSv) {
				if(err) {
					console.log(err);
					info = "bser orderSend, order.save, Error";
					Err.usError(req, res, info);
				} else {
					return res.redirect('/bsOrds');
				}
			})
		}
	})
}





exports.bsOrdNew = function(req, res) {
	let crUser = req.session.crUser;
	let obj = req.body.obj;
	// // console.log(obj);
	// for(let i=0; i<obj.secs.length; i++) {
	// 	let sec = obj.secs[i];
	// 	for(let j=0; j<sec.thds.length; j++) {
	// 		console.log(sec.thds[j])
	// 	}
	// 	console.log('------------------')
	// }
	// return;
	Pdfir.findOne({_id: obj.pdfirId}, function(err, pdfir) {
		if(err) {
			info = "bsOrderNew, Pdfir.findOne, Error!";
			Err.usError(req, res, info);
			console.log(err)
		} else {
			let dbs = new Array();

			/* ====== 创建订单数据库 ====== */
			let orderObj = new Object();
			orderObj.firm = crUser.firm;
			orderObj.creater = crUser._id;
			orderObj.status = 0;
			orderObj.code = moment(Date.now()).format('YYMMDD');
			orderObj.cter = obj.cterId;
			orderObj.sizes = pdfir.sizes
			let _order = new Order(orderObj);
			/* ====== 创建订单数据库 ====== */

			/* ====== 创建ordfir数据库 ====== */
			let ordfirObj = new Object();
			ordfirObj.order = _order._id;
			ordfirObj.pdfir = obj.pdfirId;
			ordfirObj.price = pdfir.price;
			let _ordfir = new Ordfir(ordfirObj);
			/* ====== 创建ordfir数据库 ====== */

			/* =============== 创建ordsec数据库 =============== */
			for(let j in obj.secs) {
				let sec = obj.secs[j];
				let ordsecObj = new Object();
				ordsecObj.order = _order._id;
				ordsecObj.ordfir = _ordfir._id;
				ordsecObj.pdsec = sec.pdsecId;
				ordsecObj.color = sec.color;
				let _ordsec = new Ordsec(ordsecObj);

				/* =========== 创建ordthd数据库 =========== */
				for(let k in sec.thds) {
					let thd = sec.thds[k];
					if(parseInt(thd.quot) > 0) {	// 如果有数据再创建
						let ordthdObj = new Object();
						ordthdObj.order = _order._id;
						ordthdObj.ordfir = _ordfir._id;
						ordthdObj.ordsec = _ordsec._id;
						ordthdObj.pdthd = thd.pdthdId;
						ordthdObj.color = thd.color;
						ordthdObj.size = parseInt(thd.size);
						ordthdObj.quot = parseInt(thd.quot);
						let _ordthd = new Ordthd(ordthdObj);

						_ordsec.ordthds.push(_ordthd._id)
						dbs.push(_ordthd);
					}
				}
				/* =========== 创建ordthd数据库 =========== */
				if(_ordsec.ordthds.length > 0) {	// 如果sec中有thd就加入到fir
					_ordfir.ordsecs.push(_ordsec._id);
					dbs.push(_ordsec)
				}
			}
			/* =============== 创建ordsec数据库 =============== */
			if(_ordfir.ordsecs.length > 0) {	// 如果fir中有sec则加入到order
				_order.ordfirs.push(_ordfir._id);
				dbs.push(_ordfir);
			}
			if(_order.ordfirs.length > 0) {
				bsOrdSave(req, res, _order, dbs, 0);
			} else {
				info = "请添加模特数量";
				Err.usError(req, res, info);
			}
		}
	})
}
let bsOrdSave = function(req, res, order, dbs, n) {
	if(n == dbs.length) {
		order.save(function(err, orderSv) {
			if(err) {
				info = "bsOrderNew, Order.save, Error!";console.log(err);
				Err.usError(req, res, info);
			} else {
				res.redirect('/bsOrds')
			}
		})
	} else {
		let db = dbs[n];
		db.save(function(err, dbSave) {
			if(err) console.log(err);
			bsOrdSave(req, res, order, dbs, n+1)
		})
	}
}

exports.bsOrdChangeSts = function(req, res) {
	let crUser = req.session.crUser;
	let orderId = req.body.orderId;
	let target = req.body.target;

	Order.findOne({_id: orderId, 'firm': crUser.firm})
	.populate({path: 'ordfirs', populate: [
		{path: 'pdfir'},
		{path: 'ordsecs', populate: {path: 'ordthds', populate: {path: 'pdthd'}}},
	]})
	.populate('cter')
	.exec(function(err, order) {
		let info = 'T';
		if(err) {
			console.log(err);
			info = "bsOrderNew, Order.findOne, Error!";
		} else if(!order) {
			info = "数据错误，请重试";
		} else {
			if(target == "bsOrderFinish") { // 订单状态从5变为10的时候 解除 pd与ord的联系
				if(order.status != 5) {
					info = "order 5->10 页面已过期, 不可重复操作, 请刷新页面查看!"
				} else {
					order.status = 10;
					order.fnAt = Date.now();
					SaveOrderPre.pdRelOrderFinish(order, 'bsOrderFinish')
				}
			} else if(target == "bsOrderBack") { // 订单状态从10变为5的时候 链接 pd与ord的联系
				if(order.status != 10) {
					info = "order 10->5 页面已过期, 不可重复操作, 请刷新页面查看!"
				} else {
					order.status = 5;
					order.fnAt = null;
					SaveOrderPre.pdRelOrderBack(order, 'bsOrderBack');
				}
			} else if(target == "bsOrderConfirm") { // 订单状态从0变为5的时候 链接 pd与ord的联系
				if(order.status != 0) {
					info = "order 0->5 页面已过期, 不可重复操作, 请刷新页面查看!"
				} else {
					order.status = 5;
					SaveOrderPre.pdRelOrderConfirm(order, "bsOrderConfirm");
				}
			} else if(target == "bsOrderCancel" || target == "bsMacCancelOrd") { // 订单状态从5变为0的时候 链接 pd与ord的联系
				if(order.status != 5) {
					info = "order 5->0 页面已过期, 不可重复操作, 请刷新页面查看!"
				} else {
					order.status = 0;
					SaveOrderPre.pdRelOrderCancel(order, "bsOrderCancel")
				}
			} else {
				info = "操作错误，请重试"
			}
			if(info == 'T') {
				order.save(function(err, orderSv) {
					if(err) {
						info = "bsOrderNew, Order.save, Error!";console.log(err);
						Err.usError(req, res, info);
					} else {
						if(target == "bsMacCancelOrd") {
							res.redirect('/bsMacs')
						} else if(target == "bsOrderBack") {
							res.redirect('/bsOrdHis')
						} else {
							res.redirect('/bsOrds')
						}
					}
				})
			} else {
				Err.usError(req, res, info);
			}
		}
	})
}