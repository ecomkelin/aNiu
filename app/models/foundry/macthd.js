let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ObjectId = Schema.Types.ObjectId;
let Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Macthd';
let dbSchema = new Schema({
	machin: {type: ObjectId, ref: 'Machin'},
	macfir: {type: ObjectId, ref: 'Macfir'},
	macsec: {type: ObjectId, ref: 'Macsec'},

	pdthd: {type: ObjectId, ref: 'Pdthd'},
	size : Number,

	quot : Number,
	ship: Number,	// ๅ่ดง้
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.quot) this.quot = 0;
		if(!this.ship) this.ship = 0;
	}
	next();
})

module.exports = mongoose.model(colection, dbSchema);