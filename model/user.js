const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
	{
		username: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		userBalance:  { type: Number }
	},
	{ collection: 'useraccountcollection_bugfix' }
);

// Compile model from schema
const model = mongoose.model('UserSchema', UserSchema);

module.exports = model;


/*
	// https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
	// https://www.mongodb.com/blog/post/json-schema-validation--locking-down-your-model-the-smart-way


	db.createCollection("useraccountcollection", {
	validator: {
		$jsonSchema: {
		bsonType: "object",
		required: [ "username", "password"               , "major", "address" ],
		properties: {
			username: {
				bsonType: "string",
				minLength: 3,
				maxLength: 10,
				description: "Username must be a unique string of length(3,10) and is required"
			},
			year: {
				bsonType: "password",
				minLength: 3,
				maxLength: 10,
				description: "Password must be a string of length(3,10) and is required"
			}
		}
	}
	})

*/
