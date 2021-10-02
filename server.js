	const express = require("express");
	const app = express();
	const port = 3000;
	const httpServer = require("http").createServer(app); // explicitly create a 'http' server
	const io = require("socket.io")(httpServer);
	const path = require('path');
	const fs = require('fs');
	const { MongoClient } = require('mongodb');
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	app.use('/', express.static(path.join(__dirname, 'static')));
	app.use(express.json());// app.use(bodyParser.json());
	/////////////////////////// login(start) ///////////////////////////////////////////////////////////////////////////

	const mongoose = require('mongoose');
	const User = require('./model/user');
	const bcrypt = require('bcryptjs');
	const jwt = require('jsonwebtoken');

	const JWT_SECRET = 'sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk';
	// https://mongoosejs.com/docs/connections.html

	(async () => {
		try {
			await mongoose.connect('mongodb+srv://sridharkritha:2244@cluster0.02kdt.mongodb.net/p2pbettingplatformdb?retryWrites=true&w=majority', {
				useNewUrlParser: true,
				useUnifiedTopology: true,
				useCreateIndex: true
			});
			console.log("UserAccount DB connection : Success");
		} catch (error) {
			console.log("UserAccount DB connection error :", error);
		}

	})();	
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	app.post('/api/register', async (req, res) => {
		const { username, password: plainTextPassword } = req.body;

		if (!username || typeof username !== 'string') {
			return res.json({ status: 'error', error: 'Invalid username' });
		}

		if (!plainTextPassword || typeof plainTextPassword !== 'string') {
			return res.json({ status: 'error', error: 'Invalid password' });
		}

		if (plainTextPassword.length < 5) {
			return res.json({
				status: 'error',
				error: 'Password too small. Should be at-least 6 characters'
			});
		}

		const password = await bcrypt.hash(plainTextPassword, 10); // passes = 10
		const userBalance = 1000; // £1000 free money for a new customer 

		try {
				const response = await User.create({
													username,
													password,
													userBalance
												});
			console.log('User created successfully: ', response);
		} catch (error) {
			if (error.code === 11000) {
				// duplicate key
				return res.json({ status: 'error', error: 'Username already in use' });
			}
			throw error;
		}

		const user = await User.findOne({ username }).lean();
		if(user) {
					// generate jwt token
					const token = jwt.sign(	{
											id: user._id,
											username: username
										},
										JWT_SECRET
									);

					return res.json({ status: 'ok', data: token, 'userBalance': userBalance });
		}

		return res.json({ status: 'error', error: 'Storage Error' });
	});
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	app.post('/api/login', async (req, res) => {
		const { username, password } = req.body;
		const user = await User.findOne({ username }).lean();

		if (!user) {
			return res.json({ status: 'error', error: 'Invalid username/password' });
		}

		if (await bcrypt.compare(password, user.password)) {
			// the username, password combination is successful
			// generate jwt token
			const token = jwt.sign(	{
									id: user._id,
									username: user.username
								},
								JWT_SECRET
							);

			return res.json({ status: 'ok', data: token, 'userBalance': user.userBalance }); // send the token to client
		}

		res.json({ status: 'error', error: 'Invalid username/password' });
	});
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	app.post('/api/change-password', async (req, res) => {
		const { token, newpassword: plainTextPassword } = req.body;

		if (!plainTextPassword || typeof plainTextPassword !== 'string') {
			return res.json({ status: 'error', error: 'Invalid password' });
		}

		if (plainTextPassword.length < 5) {
			return res.json({
				status: 'error',
				error: 'Password too small. Should be atleast 6 characters'
			});
		}

		try {
			const user = jwt.verify(token, JWT_SECRET); // is token tampered ?

			const _id = user.id;

			const password = await bcrypt.hash(plainTextPassword, 10);

			await User.updateOne(
				{ _id },
				{
					$set: { password }
				}
			);
			res.json({ status: 'ok' });
		} catch (error) {
			console.log(error);
			res.json({ status: 'error', error: ';))' });
		}
	});
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	app.post('/api/placeBet', async (req, res) => {
		const { token, betstr, oddstr, oddvalue, stakevalue, profitliabilityvalue, bettype } = req.body;

		try {
			const user = jwt.verify(token, JWT_SECRET); // is token tampered ?

			const _id = user.id;

			console.log("betAfter: ", betstr);

			// betstr = horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2
			let changeObj = {};

			changeObj[betstr + '.bets'] =  { 
								username: user.username, bettype: bettype, profitliabilityvalue: profitliabilityvalue,  
								oddvalue: oddvalue, stakevalue: stakevalue };

			// working
			// let result = await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 
			// 						{}, changeObj, 'push'); // 'push' - add a new element in the existing array.

			// Alternate
			let result = await findOneAndUpdateDB(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 
									{}, changeObj, 'push'); // 'push' - add a new element in the existing array.


			const betValue = bettype === 'backOdds' ? stakevalue : profitliabilityvalue;

			// result = await User.updateOne(	{ _id },
			// 								{$inc: { "userBalance": -betValue }}   // $inc
			// 							 );

			// Subtract the bet amount from the user balance
			// updateOne - NOT return the result but findOneAndUpdate return the result after update
			result = await User.findOneAndUpdate(	{ _id },
											{$inc: { "userBalance": -betValue }},   // $inc
											{returnOriginal: false }
										 );

			console.log(result._doc.userBalance); // user balance after update

			console.log("Placed bet successfully: ", result);

/*
			// Working
			// Update the new oddvalue and sort it by descending order
			// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds"
			let oddArray = oddstr.split('.').slice(0, -1).join('.'); // ....0.backOdds[] or ......0.layOdds[]

			changeObj = {};
			changeObj[oddArray] =  { $each: [oddvalue], $sort: -1 } ; // need temp object. Direct object assignment do NOT work => { betstr : oddvalue }
			const oddUpdate = await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 
									{}, changeObj, 'push');
*/

			res.json({ status: 'ok', "userBalance": result._doc.userBalance - betValue});
		} catch (error) {
			console.log(error);
			res.json({ status: 'error', error });
		}
	});
	/////////////////////////// login(end) /////////////////////////////////////////////////////////////
	
	const MONGO_DATABASE_NAME = 'p2pbettingplatformdb';
	const MONGO_COLLECTION_NAME = 'sportscollection';
	let client = null; // mongodb client
	let DB = null;     // database
	let COLL = null;   // collection
	
	/**
	 * An aggregation pipeline that matches on new listings in the country of Australia and the Sydney market
	 */
	const pipeline = [
		{
			'$match': {
			// 'operationType': 'insert',
			// 'fullDocument.location.country': 'India',
			// 'fullDocument.location.city': 'Chennai'

			'operationType': 'update'

			}
		}
	];

	async function main() {
		// Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
		const uri = "mongodb+srv://sridharkritha:2244@cluster0.02kdt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";


		// The Mongo Client you will use to interact with your database
		client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

		try {
			// Connect to the MongoDB cluster
			// await client.connect();

			// await connectToCluster(client);
			client.connect(async (err) => {
			if (err) {
				console.log("Cluster connection error");
				return console.error(err);
			}
			console.log("Cluster connection is successfully");

			DB = client.db(MONGO_DATABASE_NAME);
			if(!DB) {
				console.log(`Database - ${MONGO_DATABASE_NAME} - connection error`);
				return console.error(DB);
			}
			console.log(`Database - ${MONGO_DATABASE_NAME} - connected successfully`);

			COLL = client.db(MONGO_COLLECTION_NAME);
			if(!COLL) {
				console.log(`Collection - ${MONGO_COLLECTION_NAME} - connection error`);
				return console.error(COLL);
			}
			console.log(`Collection - ${MONGO_COLLECTION_NAME} - connected successfully`);

			// const result = await client.db(MONGO_DATABASE_NAME).collection(MONGO_COLLECTION_NAME).find( { }, {_id: 0, names: 1, wins: 1 } );
			// console.log(result);

			// await returnAllDouments(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);
			});

			// 1. Add some documents inside the collection
			// await createMultipleDocuments(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);

			// 2. Delete ALL documents inside the collection
			// await dropAllDocuments(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);

			// 3. Update any single document with the new value ({ wins: 99 }) - only if the document has {name: "Sridhar"} entry.
			// await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, {name: "Sridhar"}, { wins: 99 });



			// Monitor new listings using EventEmitter's on() function.
			// await monitorListingsUsingEventEmitter(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 30000, pipeline);
		} finally {
			// Close the connection to the MongoDB cluster
			// await client.close(); // why we need to close it ??
		}
	}

	// main().catch(console.error);

	async function returnAllDouments(client, dataBaseName, collectionName) {
		// See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#find for the find() docs
		// const cursor = await client.db(dataBaseName).collection(collectionName).find({ }, {_id: 1, name: 1, wins: 1 });
		// const cursor = await COLL.find({ }, {_id: 1, name: 1, wins: 1 });
		if(COLL) {
			const cursor = await COLL.find({ }, {});

			// Store the results in an array
			const results = await cursor.toArray();

			io.emit('myEvent', JSON.stringify({ ...results }));

			// Print the results
			if (results.length > 0) {
				console.log(`Documents found inside the collection - ${collectionName} :`);
				results.forEach((result, i) => {
					console.log(`${i + 1}. : ${JSON.stringify(result)}`);
					// console.log(`   wins: ${result.wins}`);
				});
			} else {
				console.log("NO document found in the database");
			}
		}
	}


	// Read the json file from local storage and move to mongodb atlas
	function uploadLocalJsonCollectionToDB(client, dataBaseName, collectionName) {
		
		//////////////////////////// Read json by nodejs fs (start) ////////////////////
		// var jsonObject;
		fs.readFile('db/sportsDB.json', 'utf8', function (err, data) {
		  if (err) {
			console.error("Unable to read the json file");
			throw err;
		  }
		  console.error("Read the local json successfully");
		  const jsonObject = JSON.parse(data);
		  console.log(jsonObject);
		  createMultipleDocuments(client, dataBaseName, collectionName, [jsonObject]);
		});
		//////////////////////////// Read json by nodejs fs (end) //////////////////////
	}

	// Create multiple documents inside the collection inside the database inside the cluster
	// documents => collection => database => cluster
	async function createMultipleDocuments(client, dataBaseName, collectionName, collData) {
		// let collData =  [	{ name: "Jay",		wins: 5, location: { city: "Chennai", country: "India"} },
		// 					{ name: "Sridhar",	wins: 9, location: { city: "London",  country: "UK"}},
		// 					{ name: "Sumitha",	wins: 7, location: { city: "Didcot",  country: "America"}}
		// ];

		// See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#insertMany for the insertMany() docs
		const result = await client.db(dataBaseName).collection(collectionName).insertMany(collData);

		console.log(`${result.insertedCount} new listing(s) created with the following id(s):`);
		console.log(result.insertedIds);
	}

	async function dropAllDocuments(client, dataBaseName, collectionName) {
		// Delete collection including all its documents
		let result = await client.db(dataBaseName).collection(collectionName).drop();
		// console.log("drop =>" + result);

		// Re-create a collection again
		result = await client.db(dataBaseName).createCollection(collectionName);
		// console.log(result);
	}

	async function findDocument(client, dataBaseName, collectionName, findObject, updateObject, operation) {
		// findOne - working
		// client.db(dataBaseName).collection(collectionName).findOne({}, function(err, result) {
		// 	if (err) throw err;

		// 	// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds"
		// 	console.log(result.horseRace.uk.Cartmel['2021-09-20']['12:00'].players[0].backOdds); 
		//   });


		// findOneAndUpdate - working
		// let temp = {};
		// temp["horseRace.uk.Cartmel.2021-09-20.12:00.players.0.lo"] = { "name": "bose", "odd": 45 };
		// const result = await client.db(dataBaseName).collection(collectionName).findOneAndUpdate(
		// 	{},
		// 	{$set: temp},   // $inc
		// 	{ returnNewDocument: true }
		//  );

		// console.log(result.value.horseRace.uk.Cartmel['2021-09-20']['12:00'].players[0].backOdds);
	}

	async function findOneAndUpdateDB(client, dataBaseName, collectionName, findObject, updateObject, operation) {

		let obj = null;

		if(operation == 'push') {
			obj = { $push: updateObject };
		}
		else {
			obj = { $set: updateObject };
		}

/*
		const result = await client.db(dataBaseName).collection(collectionName).findOneAndUpdate(
									findObject,
									obj, // {$set: temp},   // $inc
									{returnNewDocument: true}
								);
		let bets = result.value;
*/

		let result = await client.db(dataBaseName).collection(collectionName).updateOne(findObject, obj);
		result = await client.db(dataBaseName).collection(collectionName).findOne({});
		let bets = result;

		// console.log(result.value.horseRace.uk.Cartmel['2021-09-20']['12:00'].players[0].bets);
		// let bets = result.value.horseRace.uk.Cartmel['2021-09-20']['12:00'].players[0].bets;
		// let bets = result.value[Object.keys(updateObject)[0]]; // Does NOT work

		// ['horseRace', 'uk', 'Cartmel', '2021-09-20', '12:00', 'players', '2', 'bets']
		let keyStr = Object.keys(updateObject)[0];
		let keyStrLst = Object.keys(updateObject)[0].split('.'); // str => object accessor

		for(let i = 0, n = keyStrLst.length; i < n; ++i) {
			bets = bets[keyStrLst[i]];
		}

		let oddsObj = {};
		oddsObj.back = {};
		oddsObj.lay =  {};
		oddsObj.backList = { odd: [], cash:[]};
		oddsObj.layList =  { odd: [], cash:[]};
		let oddKey = null;

		for(let i = 0, n = bets.length; i < n; ++i) {
			// Browse through the objects
			for (let key in bets[i]) {
				if (bets[i].hasOwnProperty(key)) {
					if(key === 'bettype' && bets[i][key] === 'backOdds') {
						oddKey = 'back_'+ bets[i].oddvalue;
						if(!oddsObj.back[oddKey]) {
							oddsObj.back[oddKey] = 0;
							oddsObj.backList.odd.push(bets[i].oddvalue);
						}
						oddsObj.back[oddKey] += Number(bets[i].stakevalue);
					}
					else if(key === 'bettype' && bets[i][key] === 'layOdds') {
						oddKey = 'lay_'+ bets[i].oddvalue;
						if(!oddsObj.lay[oddKey]) {
							oddsObj.lay[oddKey] = 0;
							oddsObj.layList.odd.push(bets[i].oddvalue);
						}
						oddsObj.lay[oddKey] += Number(bets[i].stakevalue);
					}
				}
			}
		}

		console.log(oddsObj); // { 'back_2.8': 4, 'back_3.05': 3, 'back_3.1': 71 }
		oddsObj.backList.odd.sort((a,b) => b - a); // sort the odds
		oddsObj.layList.odd.sort((a,b)  => b - a); // sort the odds
		console.log(oddsObj);
		oddsObj.backList.cash = [...Array(oddsObj.backList.odd.length).fill(0)];
		oddsObj.layList.cash  = [...Array(oddsObj.layList.odd.length).fill(0)];

		for (let key in oddsObj.back) {
			if (oddsObj.back.hasOwnProperty(key)) {
				// { 'back_2.8': 4, 'back_3.05': 3, 'back_3.1': 75 },
				// { odd: [ 3.1, 3.05, 2.8 ], cash: [ 75, 3, 4 ] } <= Descending order
				oddsObj.backList.cash[oddsObj.backList.odd.indexOf(Number(key.replace('back_','')))] = oddsObj.back[key];
			}
		}

		for (let key in oddsObj.lay) {
			if (oddsObj.lay.hasOwnProperty(key)) {
				// { 'back_2.8': 4, 'back_3.05': 3, 'back_3.1': 75 },
				// { odd: [ 3.1, 3.05, 2.8 ], cash: [ 75, 3, 4 ] } <= Descending order
				oddsObj.layList.cash[oddsObj.layList.odd.indexOf(Number(key.replace('lay_','')))] = oddsObj.lay[key];
			}
		}

		console.log(oddsObj);


		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		// horseRace.uk.Cartmel.2021-09-20.12:00.players.2.bets

		// Update the new oddvalue and sort it by descending order
		// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds"
		let oddArray = keyStr.split('.').slice(0, -1).join('.'); // ....0.backOdds[] or ......0.layOdds[]

		changeObj = {};
		// changeObj[oddArray] =  { $each: [oddvalue], $sort: -1 } ; // need temp object. Direct object assignment do NOT work => { betstr : oddvalue }
		changeObj[oddArray +'.backOdds'] = oddsObj.backList.odd;
		changeObj[oddArray + '.layOdds'] = oddsObj.layList.odd;
		changeObj[oddArray +'.backCash'] = oddsObj.backList.cash;
		changeObj[oddArray + '.layCash'] = oddsObj.layList.cash;
		const oddUpdate = await updateManyDB(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 
								{}, changeObj);
		// const oddUpdate = await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 
		// 						{}, changeObj);

		console.log(oddUpdate);
	}


	// Update an listing with the given name
	// Note: If more than one listing has the same name, only the first listing the database finds will be updated.
	async function updateListingByName(client, dataBaseName, collectionName, findObject, updateObject, operation) {
		let obj = null;

		if(operation == 'push') {
			obj = { $push: updateObject };
		}
		else {
			obj = { $set: updateObject };
		}

		// See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateOne for the updateOne() docs
		const result = await client.db(dataBaseName).collection(collectionName).updateOne(findObject, obj);

		console.log(`${result.matchedCount} document(s) matched the query criteria.`);
		console.log(`${result.modifiedCount} document(s) was/were updated.`);
	}

		// Update an listing with the given name
	// Note: If more than one listing has the same name, only the first listing the database finds will be updated.
	async function updateManyDB(client, dataBaseName, collectionName, findObject, updateObject, operation) {
		let obj = null;

		if(operation == 'push') {
			obj = { $push: updateObject };
		}
		else {
			obj = { $set: updateObject };
		}

		// See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateOne for the updateOne() docs
		const result = await client.db(dataBaseName).collection(collectionName).updateMany(findObject, obj);

		console.log(`${result.matchedCount} document(s) matched the query criteria.`);
		console.log(`${result.modifiedCount} document(s) was/were updated.`);
	}	

	// Monitor listings in the collections for change
	// This function uses the on() function from the EventEmitter class to monitor changes
	async function monitorListingsUsingEventEmitter(client, dataBaseName, collectionName, timeInMs = 60000, pipeline = []) {
		const collection = client.db(dataBaseName).collection(collectionName);

		// See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#watch for the watch() docs
		const changeStream = collection.watch(pipeline);


		// ChangeStream inherits from the Node Built-in Class EventEmitter (https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_class_eventemitter).
		// We can use EventEmitter's on() to add a listener function that will be called whenever a change occurs in the change stream.
		// See https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_emitter_on_eventname_listener for the on() docs.
		changeStream.on('change', (changedData) => {
			console.log(changedData);
			if(changedData.operationType === 'update') {
				const updatedFieldsObject = changedData.updateDescription.updatedFields;
				io.emit('myEventChangeHappened', JSON.stringify(updatedFieldsObject));
			} else if(change.operationType === 'insert') { 
			} else if(change.operationType === 'delete') { }
		});

		// Wait the given amount of time and then close the change stream
		// await closeChangeStream(timeInMs, changeStream);
	}


	// Close the given change stream after the given amount of time
	function closeChangeStream(timeInMs = 60000, changeStream) {
		return new Promise((resolve) => {
			setTimeout(() => {
				console.log("Closing the change stream");
				changeStream.close();
				resolve();
			}, timeInMs);
		});
	}

	////////////////////////////////////////////////////////////////////////////////

	// io.on('myEventClientReady', async (data) => {
	// 	console.log("Server: Recieved 'myEventClientReady' even from client");
	// 	if(JSON.parse(data).isClientReady) {
	// 		await returnAllDouments(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);
	// 	}
	// });

	io.on('connection', async (socket) => {
		console.log('Server: A new client connected to me');
		await returnAllDouments(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);
		// await monitorListingsUsingEventEmitter(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 30000, pipeline);
		await monitorListingsUsingEventEmitter(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, 30000);

		socket.on('mySubmitEvent', async (data) => {      // note: async
			console.log('user joined room');
			console.log(data);
			// socket.join(data.myID);
			try {
				// await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, {name: "Sridhar"}, { wins: 12799 });
				await updateListingByName(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME, JSON.parse(data).findObject, JSON.parse(data).updateObject);
			} catch (e) {
				console.error(e);
			}
		});
	});



	httpServer.listen(port, async () => {
		console.log("Server is running on the port: " + httpServer.address().port);

		// Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
		const uri = "mongodb+srv://sridharkritha:2244@cluster0.02kdt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

		// The Mongo Client you will use to interact with your database
		client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

		try {
				await client.connect();
				console.log("Cluster connection is successfully");


				DB = client.db(MONGO_DATABASE_NAME);
				if(!DB) {
					console.log(`Database - ${MONGO_DATABASE_NAME} - connection error`);
					return console.error(DB);
				}
				console.log(`Database - ${MONGO_DATABASE_NAME} - connected successfully`);

				COLL = DB.collection(MONGO_COLLECTION_NAME);
				if(!COLL) {
					console.log(`Collection - ${MONGO_COLLECTION_NAME} - connection error`);
					return console.error(COLL);
				}
				console.log(`Collection - ${MONGO_COLLECTION_NAME} - connected successfully`);

				// 0. Upload json doc(a set of collection) to db
				// uploadLocalJsonCollectionToDB(client, MONGO_DATABASE_NAME, MONGO_COLLECTION_NAME);

		} catch(e) {
			console.error(e);
		}
		
	});

