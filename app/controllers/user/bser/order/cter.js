let Err = require('../../aaIndex/err');

let Cter = require('../../../../models/client/cter');
let Order = require('../../../../models/client/order');

let _ = require('underscore');

exports.bsCters = function(req, res) {
	let crUser = req.session.crUser;

	let keySymb = '$ne';
	let keyword = ' x '
	if(req.query.keyword) {
		keySymb = '$in';
		keyword = String(req.query.keyword);
		keyword = keyword.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
		keyword = new RegExp(keyword + '.*');
	}

	let sortCond = 'code';
	if(req.query.sortCond) sortCond = req.query.sortCond;

	let sortVal = 1;
	if(req.query.sortVal && !isNaN(parseInt(req.query.sortVal))) {
		sortVal = parseInt(req.query.sortVal);
	}

	let skip = 0;
	if(req.query.skip && !isNaN(parseInt(req.query.skip))) {
		skip = parseInt(req.query.skip)
	}

	Cter.countDocuments({
		'firm': crUser.firm,
		$or:[
			{'code': {[keySymb]: keyword}},
			{'nome': {[keySymb]: keyword}},
		],
	}, function(err, keyCount) {
		if(err) {
			console.log(err);
			info = "bsCters, Cter.countDocuments， Error！";
			Err.usError(req, res, info);
		} else {
			Cter.find({
				'firm': crUser.firm,
				$or:[
					{'code': {[keySymb]: keyword}},
					{'nome': {[keySymb]: keyword}},
				],
			})
			.sort({[sortCond]: sortVal})
			.skip(skip)
			// .limit(12)
			.exec(function(err, cters) { if(err) {
				console.log(err);
				info = "bsCters, Cter.find, Error！";
				Err.usError(req, res, info);
			} else {
				res.render('./user/bser/order/cter/list', {
					title: '客戶',
					crUser : crUser,
					cters: cters,
				})
			} })
		}
	})
}



exports.bsCterFilter = function(req, res, next) {
	let crUser = req.session.crUser;
	let id = req.params.id
	Cter.findOne({_id: id, 'firm': crUser.firm})
	.populate({path:'orders', populate: {
		path: 'ordfirs', populate: [
			{path: 'ordsecs', populate: {path: 'ordthds'}},
			{path: 'pdfir'}
		]
	} })
	.exec(function(err, cter) { if(err) {
		info = "bsCterFilter, Cter.findOne, Error!";
		Err.usError(req, res, info);
	} else if(!cter) {
		info = "此客户已经被删除";
		Err.usError(req, res, info);
	} else {
		req.body.cter = cter;
		next();
	} })
}
exports.bsCter = function(req, res) {
	let crUser = req.session.crUser;

	let objBody = new Object();
	objBody.cter = req.body.cter;
	// console.log(objBody.object)
	objBody.title = '客户信息';
	objBody.crUser = crUser;
	objBody.thisAct = "/bsCter";

	res.render('./user/bser/order/cter/detail', objBody);
}


exports.bsCterDel = function(req, res) {
	let cter = req.body.cter;
	if(cter.orders && cter.orders.length > 0) {
		info = "此客户还有订单,不可以删除";
		Err.usError(req, res, info);
	} else {
		Cter.deleteOne({_id: cter._id}, function(err, objRm) { if(err) {
			info = "bs删除客户时, 客户数据库删除错误, 请联系管理员";
			Err.usError(req, res, info);
		} else {
			res.redirect('/bsCters')
		} })
	}
}

exports.bsCterDelAjax = function(req, res) {
	let crUser = req.session.crUser;

	let id = req.query.id;
	Cter.findOne({_id: id}, function(err, object){ if(err) {
		res.json({success: 0, info: "bsCterDelAjax, Cter.findOne, Error"})
	} else if(!object){
		res.json({success: 0, info: "此客户已经被删除"})
	} else if(object.firm != crUser.firm){
		res.json({success: 0, info: "操作错误,请联系管理员! bsCterDelAjax, object.firm != crUser.firm"})
	} else {
		if(object.orders && object.orders.length > 0) {
			res.json({success: 0, info: "此客户还有订单,不可以删除"})
		} else {
			Cter.deleteOne({_id: object._id}, function(err, objRm) { if(err) {
				res.json({success: 0, info: "bsCterDelAjax, Cter.deleteOne,Error!"})
			} else {
				res.json({success: 1})
			} })
		}
	} })
}




exports.bsCterUpd = function(req, res) {
	let crUser = req.session.crUser;
	let obj = req.body.obj
	if(obj.code) obj.code= obj.code.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
	if(obj.nome) obj.nome= obj.nome.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();

	Cter.findOne({_id: obj._id, 'firm': crUser.firm})
	.exec(function(err, object) {
		if(err) {
			info = "bsCterUpd, Cter.findOne, Error!";
			Err.usError(req, res, info);
		} else if(!object) {
			info = "deleted! refresh Page!";
			Err.usError(req, res, info);
		} else {
			Cter.findOne({'nome': obj.nome, 'firm': crUser.firm})
			.where('_id').ne(obj._id)
			.exec(function(err, objExist) {
				if(err) {
					info = "bsCterUpd, Cter.findOne, Error!";
					Err.usError(req, res, info);
				} else if(objExist) {
					info = "已经有了此名字！";
					Err.usError(req, res, info);
				} else {
					let _object
					_object = _.extend(object, obj)
					_object.save(function(err, objSave){
						if(err) console.log(err);
						res.redirect('/bsCter/'+objSave._id);
					})
				}
			})
		} 
	})
}



exports.bsCterAdd =function(req, res) {
	let crUser = req.session.crUser;

	Cter.countDocuments({'firm': crUser.firm}, function(err, count) { if(err) {
		info = "bsCterAdd, Cter.countDocuments, Error!";
		Err.usError(req, res, info);
	} else {
		count = count +1;
		for(let len = (count + "").length; len < 4; len = count.length) { // 序列号补0
			count = "0" + count;            
		}
		let code = count;
		let orderId = req.query.order;
		res.render('./user/bser/order/cter/add', {
			title: '新客户',
			crUser : req.session.crUser,
			code: code,
			orderId: orderId,
			thisAct: "/bsCter",
		});
	} })
}


exports.bsCterNew = function(req, res) {
	let crUser = req.session.crUser;
	let obj = req.body.obj

	if(obj.code) {
		obj.code= obj.code.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
	} else {
		obj.code = 'NON';
	}
	if(obj.nome) obj.nome = obj.nome.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
	if(obj.iva) obj.iva= obj.iva.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();

	obj.firm = crUser.firm;
	Cter.findOne({'firm': crUser.firm, nome: obj.nome}, function(err, objSm) {
		if(err) {
			info = "bsCterNew, Cter.findOne, Error!";
			Err.usError(req, res, info);
		} else if(objSm) {
			info = "已经有了此名字, 请换个名字！";
			Err.usError(req, res, info);
		} else {
			let _cter = new Cter(obj);
			_cter.save(function(err, cterSave) { if(err) {
				info = "bsCterNew, _cter.save, Error!";
				Err.usError(req, res, info);
			} else {
				res.redirect('/bsCters')
			} })
		}
	})
}

exports.bsCterNewAjax = function(req, res) {
	let crUser = req.session.crUser;
	let nome = req.query.nome.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();

	let obj = new Object();
	obj.code = 'NON';
	obj.nome = nome
	obj.firm = crUser.firm;

	Cter.findOne({'firm': crUser.firm, nome: obj.nome}, function(err, objSm) {
		if(err) {
			info = "bsCterNew, Cter.findOne, Error!";
			res.json({success: 0, info: info});
		} else if(objSm) {
			info = "已经有了此名字, 请换个名字！";
			res.json({success: 0, info: info});
		} else {
			let _cter = new Cter(obj);
			_cter.save(function(err, cterSave) { if(err) {
				info = "bsCterNew, _cter.save, Error!";
				res.json({success: 0, info: info});
			} else {
				res.json({success: 1, cter: cterSave});
			} })
		}
	})
}


exports.bsCterIsAjax = function(req, res) {
	let crUser = req.session.crUser;
	let keytype = req.query.keytype
	let keyword = req.query.keyword
	keyword = String(keyword).replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
	Cter.findOne({
		'firm': crUser.firm,
		[keytype]: keyword
	})
	.exec(function(err, object){
		if(err) {
			res.json({success: 0, info: "bsCterIsAjax, Cter.findOne, Error!"});
		} else if(object){
			res.json({ success: 1, object: object})
		} else {
			res.json({success: 0})
		}
	})
}


exports.bsCtersObtAjax = function(req, res) {
	let crUser = req.session.crUser;
	let keytype = req.query.keytype
	let keyword = ' x '
	if(req.query.keyword) {
		keyword = String(req.query.keyword);
		keyword = keyword.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
	}

	let keywordReg = new RegExp(keyword + '.*');
	Cter.find({
		'firm': crUser.firm,
		$or:[
			{'code': {'$in': keywordReg}},
			{'nome': {'$in': keywordReg}},
		]
	})
	.limit(5)
	.exec(function(err, cters){
		if(err) {
			res.json({success: 0, info: "bs获取客户列表时，数据库查找错误, 请联系管理员"});
		} else if(!cters){
			res.json({success: 0, info: "bs 获取客户列表错误, 请联系管理员"})
		} else {
			Cter.findOne({
				'firm': crUser.firm,
				$or: [
					{'code': keyword},
					{'nome': keyword},
				]
			})
			.exec(function(err, cter) {
				if(err) {
					console.log(err);
					res.json({success: 0, info: "bs获取客户列表时，数据库查找错误, 请联系管理员"});
				} else if(!cter) {
					res.json({ success: 1, cters: cters})
				} else {
					// console.log(cter)
					res.json({success: 2, cter: cter, cters: cters})
				}
			})
		}
	})
}