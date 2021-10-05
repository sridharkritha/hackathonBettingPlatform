window.addEventListener('load', function () {
	//////////////////////////// Utility Functions (start) /////////////////////////////////////////////////////////////
	function randomIntFromInterval(min, max) { // min and max included 
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
	//////////////////////////// Utility Functions (end) ///////////////////////////////////////////////////////////////	

	//////////////////////////// Client to Server communication (start) ////////////////////////////////////////////////	
	// Using HTML - Load "client.html" (do NOT run "node client.js")
	// It uses 'io' from the distributed version of socket.io from "client-dist/socket.io.js"
	const socket = io("http://localhost:3000", { autoConnect:false, transports : ['websocket'] }); // internally emits "connection" event

	socket.on("connect", async () => {
		// console.log('myEventClientReady - event is sent');
		socket.emit('myEventClientReady', JSON.stringify({ isClientReady: true }));
	});
	socket.connect(); // need bcos 'autoConnect:false'


	// Update the balance after match has been completed
	socket.on("notifyEvent_BalancedUpdated", (data) => { 
		// updateBalanceAfterResult();
	});


	// "{"horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1":7}"
	socket.on("myEventChangeHappened", (data) => { 
		const changedObject = JSON.parse(data);
		// let key = Object.keys(changedObject)[0];
		Object.keys(changedObject).forEach((key) => {
			let value = changedObject[key];

			// console.error(value);

			// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0'
			// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.bets.83'
			let betType = key.split('.').splice(-2)[1]; // [0 , 'backOdds'] 

			if(betType === 'backOdds') {
				// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2#odd'
				document.getElementById(key + '.0#odd').innerHTML = value[2]? value[2] : "BET";
				document.getElementById(key + '.1#odd').innerHTML = value[1]? value[1] : "BET";
				document.getElementById(key + '.2#odd').innerHTML = value[0]? value[0] : "BET";
			}
			else if(betType === 'backCash') {
				// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2#odd'
				document.getElementById(key + '.0#cash').innerHTML = "£ " + (value[2]? value[2] : "0.00");
				document.getElementById(key + '.1#cash').innerHTML = "£ " + (value[1]? value[1] : "0.00");
				document.getElementById(key + '.2#cash').innerHTML = "£ " + (value[0]? value[0] : "0.00");
			}
			else if(betType === 'layOdds') {
				// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.0#odd'
				document.getElementById(key + '.0#odd').innerHTML = value[0]? value[0] : "BET";
				document.getElementById(key + '.1#odd').innerHTML = value[1]? value[1] : "BET";
				document.getElementById(key + '.2#odd').innerHTML = value[2]? value[2] : "BET";
			}
			else if(betType === 'layCash') {
				// 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.0#odd'
				document.getElementById(key + '.0#cash').innerHTML = "£ " + (value[0]? value[0] : "0.00");
				document.getElementById(key + '.1#cash').innerHTML = "£ " + (value[1]? value[1] : "0.00");
				document.getElementById(key + '.2#cash').innerHTML = "£ " + (value[2]? value[2] : "0.00");
			}
		});
	});

	// socket.on => listener; socket.emit => sends event.
	// Add listener for the event "myEvent" but NOT execute the callback
	// Callback will be executed only after if you get the "myEvent"
	// console.log('myEvent - addListener is ready for the server');
	socket.on("myEvent", (data) => {
		console.log("Message: ", data); // gets executed only after the "myEvent" arrives.

		const db = JSON.parse(data); // Read the json file from server.js from mongodb
		console.log(db);
		processInputData(db[0]);
	});
	//////////////////////////// Client to Server communication (end) //////////////////////////////////////////////////

	/*
	RaceCard:
	---------
		g_CurrentDisplayedMatch.idString = "horseRace.uk.Cartmel.2021-09-20.12:00"
		idString = 	    "horseRace.uk.Cartmel.2021-09-20.12:00.players.0."
		winLossValueId= "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.winLossValueId"
		backOdd = 	    "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1"
		cell fulldata=	"horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.1"
		layOddValue  = 	"horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.1#odd"

	BetSlip:
	--------
		playerid = 	  "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_playerId"
		oddInput = 	  "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_oddValueId"
		stakeInput =  "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_stakeValueId"
		profitInput = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_profitLiabilityValueId"
		placeBet = 	  "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_placeBetButtonId"
		deleteBet =   "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_deleteBetButtonId"
	*/

	/////////////////////////////// Global Variables (start)////////////////////////////////////////////////////////////
	let g_CurrentDisplayedMatch = {};
	let g_BetSlipSheet = {};
	let g_WinLossByPlayers = []; // global variable for displaying win / loss by player 
	/////////////////////////////// Global Variables (end)//////////////////////////////////////////////////////////////

	////////////////////// Dynamically construct - Race Card (start) ///////////////////////////////////////////////////
	// data <-- server <-- db
	function processInputData(data) {
		const gameName = 'horseRace';
		const region = 'uk';
		const raceName = 'Cartmel';
		const date = '2021-09-20';
		const time = '12:00';

		const ref = data[gameName][region][raceName][date][time];
		const matchType = ref.matchType;
		const runLength = ref.runLength;
		const players = ref.players;
		const playerCount = players.length;

		// {'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.horseName': "11 French Company"},
		// {'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds' : [1,2,3]});
		// {"horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1":7}

		let eventinfo = {
						'gameName':gameName,
						'region':region,
						'raceName': raceName,
						'date':date,
						'time': time,
						'playerCount': playerCount,
						'evtStr': gameName +'.'+ region +'.'+ raceName +'.'+ date +'.'+ time // "horseRace.uk.Cartmel.2021-09-20.12:00"
					};

		let raceCardContainer = document.getElementById('sportsEventContainer');
		raceCardContainer.textContent = ''; // reset at start

		let elem = document.createElement("div");
		elem.setAttribute("id", "raceName");
		elem.classList.add("raceCardTitle");
		elem.innerHTML = time + '&nbsp' + raceName;
		raceCardContainer.appendChild(elem);

		elem = document.createElement("div");
		elem.setAttribute("id", "matchType");
		elem.classList.add("raceCardTitle");
		elem.innerHTML = matchType + '&nbsp' + '|' + '&nbsp' + runLength;
		raceCardContainer.appendChild(elem);

		// idString = "horseRace.uk.Cartmel.2021-09-20.12:00"
		g_CurrentDisplayedMatch.idString =  eventinfo.gameName +'.'+ eventinfo.region +'.'
											+ eventinfo.raceName +'.'+ eventinfo.date +'.'+ eventinfo.time;
		g_CurrentDisplayedMatch.playerCount = playerCount;

		g_CurrentDisplayedMatch.playerInfo = []; // stores player info for declaring the winner from the losers

		for(let i = 0; i < playerCount; ++i) {
			let playerinfo = { 'playerIndexString': 'players.' + i };
			g_CurrentDisplayedMatch.playerInfo.push( {horseName: players[i].horseName , silk: players[i].silk});

			// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0."
			let idString = g_CurrentDisplayedMatch.idString + '.' + 'players' + '.' + i + '.';

			// 1st row
			let elem1 = document.createElement("div");
			elem1.classList = "gridColumnLayout gridColumnLayout_2 size_4_6 gameBetContainer";
			raceCardContainer.appendChild(elem1);
			let elem2 = document.createElement("div");
			elem2.classList = "gridColumnLayout gridColumnLayout_2 size_1_9 gameContainer";
			elem1.appendChild(elem2);
			// silk
			let elem3 = document.createElement("div");
			elem2.appendChild(elem3);
			let elem4 = document.createElement("img");
			elem4.setAttribute("alt", "silk");
			elem4.src = players[i].silk;
			elem3.appendChild(elem4);
			// Horse Name
			elem3 = document.createElement("div");
			elem2.appendChild(elem3);
			elem4 = document.createElement("div");
			elem4.classList = "player";
			playerinfo["horseName"] = players[i].horseName;
			elem4.innerHTML = players[i].horseName;
			elem3.appendChild(elem4);
			// Jockey and Trainer Name
			elem4 = document.createElement("div");
			elem4.classList = "playerDesc";
			elem4.innerHTML = 'J:' + players[i].jockeyName + '&nbsp' + 'T:'+ players[i].trainerName;
			elem3.appendChild(elem4);
			// display potential win/loss
			elem4 = document.createElement("div");
			elem4.setAttribute("class","winLossValue");
			elem4.setAttribute("id", idString + "winLossValueId");
			elem4.innerHTML = "<br>";
			elem3.appendChild(elem4);
			// odd range - back
			elem2 = document.createElement("div");
			elem2.classList = "gridColumnLayout gridColumnLayout_6 backLayBetContainer cellSize";
			elem1.appendChild(elem2);

			////////////////////////////////////////////////////////////////////////////////////////////////////////////
			// backOdds.2 // 0
			elem3 = document.createElement("div");
			elem3.classList = "backBetLowContainer backOthersBgColorHover";
			playerinfo["oddIndexString"] = 'backOdds.2';//0
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]); 
			playerinfo["odd"] = players[i].backOdds[2];// 0
			playerinfo["betType"] = "backOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd");
			elem4.innerHTML = players[i].backOdds[2] ? players[i].backOdds[2] : "BET"; // 0
			// elem3.appendChild(elem4);
			// available money
			let elem5 = document.createElement("div");
			elem5.classList = "totalAmt";
			playerinfo["cashString"] = 'backCash.2';
			elem5.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem5.innerHTML = "£ " + (players[i].backCash[2] ? players[i].backCash[2] : "0.00"); // 0
			// elem3.appendChild(elem5);
			elem3.append(elem4,elem5);

			// backOdds.1
			elem3 = document.createElement("div");
			elem3.classList = "backBetMidContainer backOthersBgColorHover";
			//elem3.setAttribute("id","oddSelected_122");
			playerinfo["oddIndexString"] = 'backOdds.1';
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]);
			playerinfo["odd"] = players[i].backOdds[1];
			playerinfo["betType"] = "backOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd");
			elem4.innerHTML = players[i].backOdds[1] ? players[i].backOdds[1] : "BET";
			elem3.appendChild(elem4);
			// available money
			elem4 = document.createElement("div");
			elem4.classList = "totalAmt";
			playerinfo["cashString"] = 'backCash.1';
			elem4.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem4.innerHTML = "£ " + (players[i].backCash[1] ? players[i].backCash[1] : "0.00");
			elem3.appendChild(elem4);

			// backOdds.0 // 2
			elem3 = document.createElement("div");
			elem3.classList = "backBetHighContainer backMainBgColor";
			playerinfo["oddIndexString"] = 'backOdds.0'; // 2
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]);
			playerinfo["odd"] = players[i].backOdds[0]; // 2
			playerinfo["betType"] = "backOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd"); // 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2#odd'
			elem4.innerHTML = players[i].backOdds[0] ? players[i].backOdds[0] : "BET"; // 2
			elem3.appendChild(elem4);
			// available money
			elem4 = document.createElement("div");
			elem4.classList = "totalAmt";
			playerinfo["cashString"] = 'backCash.0';
			elem4.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem4.innerHTML = "£ " + (players[i].backCash[0] ? players[i].backCash[0] : "0.00"); // 2
			elem3.appendChild(elem4);
			////////////////////////////////////////////////////////////////////////////////////////////////////////////

			// odd range - lay
			// layOdds.0
			elem3 = document.createElement("div");
			elem3.classList = "layBetLowContainer layMainBgColor";
			playerinfo["oddIndexString"] = 'layOdds.0';
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.0"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]); 
			playerinfo["odd"] = players[i].layOdds[0];
			playerinfo["betType"] = "layOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd"); // 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.0#odd'
			elem4.innerHTML = players[i].layOdds[0] ? players[i].layOdds[0] : "BET";
			elem3.appendChild(elem4);
			// available money
			elem4 = document.createElement("div");
			elem4.classList = "totalAmt";
			playerinfo["cashString"] = 'layCash.0';
			elem4.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem4.innerHTML = "£ " + (players[i].layCash[0] ? players[i].layCash[0] : "0.00");
			elem3.appendChild(elem4);

			// layOdds.1
			elem3 = document.createElement("div");
			elem3.classList = "layBetMidContainer layOthersBgColorHover";
			playerinfo["oddIndexString"] = 'layOdds.1';
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.1"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]); 
			playerinfo["odd"] = players[i].layOdds[1];
			playerinfo["betType"] = "layOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd");
			elem4.innerHTML = players[i].layOdds[1] ? players[i].layOdds[1] : "BET";
			elem3.appendChild(elem4);
			// available money
			elem4 = document.createElement("div");
			elem4.classList = "totalAmt";
			playerinfo["cashString"] = 'layCash.1';
			elem4.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem4.innerHTML = "£ " + (players[i].layCash[1] ? players[i].layCash[1] : "0.00");
			elem3.appendChild(elem4);

			// layOdds.2
			elem3 = document.createElement("div");
			elem3.classList = "layBetHighContainer layOthersBgColorHover";
			playerinfo["oddIndexString"] = 'layOdds.2';
			// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.2"
			elem3.setAttribute("id", idString + playerinfo["oddIndexString"]); 
			playerinfo["odd"] = players[i].layOdds[2];
			playerinfo["betType"] = "layOdds";
			elem3.setAttribute("data-eventinfo",  JSON.stringify(eventinfo));
			elem3.setAttribute("data-playerinfo", JSON.stringify(playerinfo));
			elem3.addEventListener('click', addToBetSlip); // works
			elem2.appendChild(elem3);
			// available money wrapper
			elem4 = document.createElement("div");
			elem4.classList = "odd";
			elem4.setAttribute("id", idString + playerinfo["oddIndexString"]+ "#odd");
			elem4.innerHTML = players[i].layOdds[2] ? players[i].layOdds[2] : "BET";
			elem3.appendChild(elem4);
			// available money
			elem4 = document.createElement("div");
			elem4.classList = "totalAmt";
			playerinfo["cashString"] = 'layCash.2';
			elem4.setAttribute("id", idString + playerinfo["cashString"]+ "#cash");
			elem4.innerHTML = "£ " + (players[i].layCash[2] ? players[i].layCash[2] : "0.00");
			elem3.appendChild(elem4);	
		}
	}
	////////////////////// Dynamically construct - Race Card (end) /////////////////////////////////////////////////////


	/////////////// Dynamically construct - Bet slip (start) ///////////////////////////////////////////////////////////

	// default 'e' is send by the function
	function addToBetSlip(e) {

		if(!g_BetSlipSheet[this.id]) {
			g_BetSlipSheet[this.id] = { };
			g_BetSlipSheet[this.id].eventinfo  = JSON.parse(this.dataset.eventinfo);
			g_BetSlipSheet[this.id].playerinfo = JSON.parse(this.dataset.playerinfo);
			constructBetSlip(g_BetSlipSheet, this.id, g_BetSlipSheet[this.id].eventinfo.playerCount);

			// Initialize g_WinLossByPlayers array
			if(!g_WinLossByPlayers.length) {
				for(let i = 0, n = g_BetSlipSheet[this.id].eventinfo.playerCount; i < n; ++i) g_WinLossByPlayers[i] = 0;
			}
		}

		console.log(this);
		console.log(e.currentTarget); // element you clicked
		console.log(JSON.parse(this.dataset.eventinfo));
		console.log(JSON.parse(this.dataset.playerinfo));

		// do something with e, param1 and param2
		// console.log(e, param1, param2);
		document.getElementById('betSlipContainer').style.display = 'block';
	}

	// Construct the bet slip
	function constructBetSlip(betSlipSheet, key, playerCount) {
		let elemRef = null; 
		let parentElemRef = null;

		// key = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0"
		parentElemRef = document.createElement("DIV");
		betSlipSheet[key].parentElemRef = parentElemRef;
		document.getElementById("betSlipContainer").appendChild(parentElemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_timeVenueId"); 
		elemRef.setAttribute("class","gridColumnLayout gridColumnLayout_2");
		parentElemRef.appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_timeId");
		document.getElementById(key+"_timeVenueId").appendChild(elemRef); 

		elemRef = document.createTextNode(betSlipSheet[key].eventinfo.time); // ("12:00");
		document.getElementById(key+"_timeId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_venueId");
		document.getElementById(key+"_timeVenueId").appendChild(elemRef); 

		elemRef = document.createTextNode(betSlipSheet[key].eventinfo.raceName); //("Cartmel");
		document.getElementById(key+"_venueId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_outcomePlayerId");
		elemRef.setAttribute("class","gridColumnLayout gridColumnLayout_2");
		parentElemRef.appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_outcomeId");
		document.getElementById(key+"_outcomePlayerId").appendChild(elemRef); 

		elemRef = document.createTextNode(betSlipSheet[key].playerinfo.betType); // ("backOdds");
		document.getElementById(key+"_outcomeId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_playerId");
		elemRef.setAttribute("class","halfOpaque");
		document.getElementById(key+"_outcomePlayerId").appendChild(elemRef); 

		elemRef = document.createTextNode(betSlipSheet[key].playerinfo.horseName); // ("11 French Company");
		document.getElementById(key+"_playerId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id", key+"_backStakeProfitBetBinId");
		elemRef.setAttribute("class","gridColumnLayout gridColumnLayout_5 gridCenterVH");
		parentElemRef.appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_backPlusMinusId");
		elemRef.setAttribute("class","gridColumnLayout gridColumnLayout_3");
		document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id", key+"_subtractBackId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","gridCenterVH backMainBgColor");
		}
		else {
			elemRef.setAttribute("class","gridCenterVH layMainBgColor");
		}

		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('click', subtractOdd);
		document.getElementById(key+"_backPlusMinusId").appendChild(elemRef); 

		elemRef = document.createTextNode("-");
		document.getElementById( key+"_subtractBackId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_backOthersBgColorId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backOthersBgColor");
		}
		else {
			elemRef.setAttribute("class","layOthersBgColor");
		}

		document.getElementById(key+"_backPlusMinusId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_backMainFontColorId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backMainFontColor");
		}
		else {
			elemRef.setAttribute("class","layMainFontColor");
		}
		document.getElementById(key+"_backOthersBgColorId").appendChild(elemRef); 

		elemRef = document.createTextNode(betSlipSheet[key].playerinfo.betType); //("BACK");
		document.getElementById(key+"_backMainFontColorId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_backValueContainerId");
		document.getElementById(key+"_backOthersBgColorId").appendChild(elemRef); 
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		elemRef = document.createElement("INPUT");
		elemRef.setAttribute("id", key+"_oddValueId");   // "backValueId");
		elemRef.setAttribute("class","betSlipInputbox");
		elemRef.setAttribute("type","number");
		elemRef.setAttribute("value",betSlipSheet[key].playerinfo.odd);
		elemRef.setAttribute("placeholder","1.01");
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('input', onInputValueUpdated);
		elemRef.addEventListener('focusout', onInputFocusoutMinOddCorrection);
		document.getElementById(key+"_backValueContainerId").appendChild(elemRef); 
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id", key+"_additionBackId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","gridCenterVH backMainBgColor");
		}
		else {
			elemRef.setAttribute("class","gridCenterVH layMainBgColor");
		}
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('click', addOdd);
		document.getElementById(key+"_backPlusMinusId").appendChild(elemRef); 

		elemRef = document.createTextNode("+");
		document.getElementById(key+"_additionBackId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_stakeBackOthersBgColor");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backOthersBgColor");
		}
		else {
			elemRef.setAttribute("class","layOthersBgColor");
		}

		document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_stakeId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backMainFontColor");
		}
		else {
			elemRef.setAttribute("class","layMainFontColor");
		}

		document.getElementById(key+"_stakeBackOthersBgColor").appendChild(elemRef); 

		elemRef = document.createTextNode("STAKE");
		document.getElementById(key+"_stakeId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_stakeValueContainerId");
		document.getElementById(key+"_stakeBackOthersBgColor").appendChild(elemRef);
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		// Stake input
		elemRef = document.createElement("INPUT");
		elemRef.setAttribute("id", key+"_stakeValueId");
		elemRef.setAttribute("class","betSlipInputbox");
		elemRef.setAttribute("type","number");
		elemRef.setAttribute("value","");
		elemRef.setAttribute("placeholder","0.0");
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('input', onInputValueUpdated);
		document.getElementById(key+"_stakeValueContainerId").appendChild(elemRef); 
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_profitBackOthersBgColorId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backOthersBgColor");
		}
		else {
			elemRef.setAttribute("class","layOthersBgColor");
		}

		document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_profitBackMainFontColorId");
		if(betSlipSheet[key].playerinfo.betType === "backOdds") {
			elemRef.setAttribute("class","backMainFontColor");
			document.getElementById(key+"_profitBackOthersBgColorId").appendChild(elemRef); 

			elemRef = document.createTextNode("PROFIT");
			document.getElementById(key+"_profitBackMainFontColorId").appendChild(elemRef);
		}
		else {
			elemRef.setAttribute("class","layMainFontColor");
			document.getElementById(key+"_profitBackOthersBgColorId").appendChild(elemRef); 

			elemRef = document.createTextNode("LIABILITY");
			document.getElementById(key+"_profitBackMainFontColorId").appendChild(elemRef);
		} 

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_profitValueBackMainFontColorId");
		document.getElementById(key+"_profitBackOthersBgColorId").appendChild(elemRef); 
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		// Profit / Liability input
		elemRef = document.createElement("INPUT");
		elemRef.setAttribute("id", key+"_profitLiabilityValueId");   // "_profitLiabilityValueId"
		elemRef.setAttribute("class","betSlipInputbox");
		elemRef.setAttribute("type","number");
		elemRef.setAttribute("value","");
		elemRef.setAttribute("placeholder","0.0");
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('input', onInputValueUpdated);
		document.getElementById(key+"_profitValueBackMainFontColorId").appendChild(elemRef);

//////////////////////////////// AFTER BET (START) /////////////////////////////////////////////////////////////////////

// 4th COLUMN - Confirm the accepted bet 

elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betConfirmWrapper");
elemRef.setAttribute("class","backOthersBgColor");
elemRef.style.display = 'none'; // hide at start
document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

// TOP
elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betConfirm");

elemRef.setAttribute("class","backMainFontColor");
document.getElementById(key+"_betConfirmWrapper").appendChild(elemRef);

elemRef = document.createTextNode("BET ACCEPTED ✔");
document.getElementById(key+"_betConfirm").appendChild(elemRef);

// bottom
elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betCancelWrapperId");
elemRef.setAttribute("class","blink_me");


document.getElementById(key+"_betConfirmWrapper").appendChild(elemRef); 
elemRef = document.createTextNode("WAITING FOR THE MATCH BET...");

document.getElementById(key+"_betCancelWrapperId").appendChild(elemRef);



////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 5th COLUMN - SHOW THE MATCHED MONEY

elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betMatchingWrapperId");
elemRef.setAttribute("class","backOthersBgColor");
elemRef.style.display = 'none'; // hide at start
document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

// TOP
elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betMatchingId");

elemRef.setAttribute("class","backMainFontColor");
document.getElementById(key+"_betMatchingWrapperId").appendChild(elemRef);

elemRef = document.createTextNode("£ Matched / £ Total");
document.getElementById(key+"_betMatchingId").appendChild(elemRef);

// bottom
elemRef = document.createElement("DIV");
elemRef.setAttribute("id",key+"_betMatchedAmtWrapperId");
document.getElementById(key+"_betMatchingWrapperId").appendChild(elemRef); 
elemRef = document.createTextNode("£ 5.00 / £ 24.00");
document.getElementById(key+"_betMatchedAmtWrapperId").appendChild(elemRef);
//////////////////////////////// AFTER BET (END) /////////////////////////////////////////////////////////////////////


		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_placeBetButtonId");
		elemRef.setAttribute("class","tickButtonBackground");
		// store the bet info
		elemRef.setAttribute("data-betInfo", JSON.stringify(betSlipSheet[key]));
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('click', placeBet);
		document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

		elemRef = document.createTextNode("✔");
		document.getElementById(key+"_placeBetButtonId").appendChild(elemRef); 

		// Delete the bet slip
		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id",key+"_deleteBetButtonId");
		elemRef.setAttribute("class","binButtonBackground");
		elemRef.setAttribute("data-playercount", playerCount);
		elemRef.addEventListener('click', deleteBetSlip);
		document.getElementById(key+"_backStakeProfitBetBinId").appendChild(elemRef); 

		elemRef = document.createTextNode("🗑");
		document.getElementById(key+"_deleteBetButtonId").appendChild(elemRef);
	}

	// constructBetSlip();
	///////////////// Dynamically construct - Bet slip  (end) //////////////////////////////////////////////////////////


	////////////////// stack addition and subtraction (start) //////////////////////////////////////////////////////////
	// Decrement the odd
	function subtractOdd(e) {

		const oddId = this.id.replace('_subtractBackId','_oddValueId'); // src, dst

		const oddValue = document.getElementById(oddId); 

		let value = Number(oddValue.value);

		if(typeof value == 'number') {
			if(value > 0.5) {
				value =  (value - 0.5).toFixed(2);
				if(value < 1.01) value = 1.01;
				document.getElementById(oddId).value = value;
			}
			else {
				// value = (0).toFixed(2);
				document.getElementById(oddId).value = 1.01; // min lay/back odd
			}
		
			fillInputFields(oddId, value, Number(e.currentTarget.dataset.playercount));
		}
		else console.error("Invalid number: ", value);
	}

	// Increment the odd
	function addOdd(e) {
		// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0_additionBackId"
		const oddId = this.id.replace('_additionBackId','_oddValueId'); // src, dst

		const oddValue = document.getElementById(oddId); 

		let value = Number(oddValue.value);

		if(typeof value == 'number') {
			if(value) {
				value = (value+ 0.5).toFixed(2);
				document.getElementById(oddId).value = value;
			}
			else {
				value = (0.5).toFixed(2);
				document.getElementById(oddId).value = (0.5).toFixed(2);
			}
		
			fillInputFields(oddId, value, Number(e.currentTarget.dataset.playercount));
		}
		else console.error("Invalid number: ", value);
	}

	//  updatedFields from DB: horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1: 9

	// Place a bet
	function placeBet(e) {

		// oddstr = horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2
		// oddstr = horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.2
		const oddstr = this.id.replace('_placeBetButtonId',''); // src, dst
		const betstr = oddstr.split('.').slice(0, -2).join('.'); // horseRace.uk.Cartmel.2021-09-20.12:00.players.0
		const bettype = oddstr.split('.').splice(-2)[0]; // backOdds (or) layOdds
		const oddvalue = Number(document.getElementById(oddstr + '_oddValueId').value);
		const stakevalue = Number(document.getElementById(oddstr + '_stakeValueId').value);
		const profitliabilityvalue = Number(document.getElementById(oddstr + '_profitLiabilityValueId').value);

		if( typeof stakevalue == 'number' && stakevalue > 0 &&
		    typeof oddvalue == 'number' && oddvalue > 0 &&
			typeof profitliabilityvalue == 'number' && profitliabilityvalue > 0 ) {

			// {'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.horseName': "11 French Company"}, 
			// {'horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds' : [1,2,3]});
			// console.log(JSON.parse(this.dataset.betinfo));
			sendBetRequest(betstr, oddstr, oddvalue, stakevalue, profitliabilityvalue, bettype);

			// hide (bet/bin) buttons and show (bet placed Confirm / Matched Bet Amt) text's
			// hide
// 			document.getElementById(this.id).style.display = 'none';
// 			document.getElementById(this.id.replace('_placeBetButtonId','_deleteBetButtonId')).style.display = 'none';
// 			// show
// 			document.getElementById(this.id.replace('_placeBetButtonId','_betConfirmWrapper')).style.display = 'block';
// 			document.getElementById(this.id.replace('_placeBetButtonId','_betMatchingWrapperId')).style.display = 'block';

		}
		else console.error("Invalid bet amount: ", stakevalue);
	}

	// Send a bet request to the server
	function sendBetRequest(betstr, oddstr, oddvalue, stakevalue, profitliabilityvalue, bettype) {
		if( typeof stakevalue == 'number' && stakevalue > 0 &&
			typeof oddvalue == 'number' && oddvalue > 0 &&
			typeof profitliabilityvalue == 'number' && profitliabilityvalue > 0 ) {
			// oddstr = horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.2
			// oddstr = horseRace.uk.Cartmel.2021-09-20.12:00.players.0.layOdds.2
			(async() => {
				const res = await fetch('/api/placeBet', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json'},
					body: JSON.stringify({
						token: localStorage.getItem('token'),
						betstr: betstr,
						oddstr: oddstr,
						oddvalue: oddvalue,
						stakevalue: stakevalue,
						profitliabilityvalue: profitliabilityvalue, 
						bettype: bettype
					})
				}).then((res) => res.json());

				if (res.status === 'ok') {
					document.getElementById("userBalanceAmount").textContent = "Balance: " + res.userBalance;

					// hide (bet/bin) buttons and show (bet placed Confirm / Matched Bet Amt) text's
					// hide
					document.getElementById(oddstr + '_placeBetButtonId').style.display = 'none';
					document.getElementById(oddstr + '_deleteBetButtonId').style.display = 'none';
					// show
					document.getElementById(oddstr + '_betConfirmWrapper').style.display = 'block';
					document.getElementById(oddstr + '_betMatchingWrapperId').style.display = 'block';

					let str = null;

					str = (bettype == 'backOdds') ? '£ '+ 0 + ' / ' + '£ '+ stakevalue : '£ '+ 0 + ' / ' + '£ '+ profitliabilityvalue;

					document.getElementById(oddstr + '_betMatchedAmtWrapperId').textContent = str;


					let key = null;
					let matchvalue = 0;
					let cashvalue = 0;
					for(let i = 0, n = res.matchedOdds.length; i < n; ++i) {
						Object.keys(g_BetSlipSheet).forEach((key) => {
							if( g_BetSlipSheet[key].playerinfo.odd === Number(Object.keys(res.matchedOdds[i])[0]) &&
								g_BetSlipSheet[key].playerinfo.betType === res.matchedOdds[i][Object.keys(res.matchedOdds[i])[0]].bettype
							  )
							{
								key = Object.keys(res.matchedOdds[i])[0];
								matchvalue = res.matchedOdds[i][key].matchvalue;
								cashvalue = res.matchedOdds[i][key].bettype == 'backOdds' ? res.matchedOdds[i][key].stakevalue: res.matchedOdds[i][key].profitliabilityvalue;

								str = '£ '+ (cashvalue -  matchvalue) + ' / ' + '£ '+ cashvalue;

								if(!matchvalue) {
									document.getElementById(res.matchedOdds[i][key].oddstr + '_betCancelWrapperId').textContent = 'Matched !';
									document.getElementById(res.matchedOdds[i][key].oddstr + '_betCancelWrapperId').classList.remove("blink_me");
								}

								document.getElementById(res.matchedOdds[i][key].oddstr + '_betMatchedAmtWrapperId').textContent = str;
							}
						});
					}
					// everything went fine
					console.log("Bet Placed Successfully");
				} else {
					console.error("Bet Placed Error: ", res.error);
					// alert(res.error);
				}
			})();
		}
		else console.error("Invalid bet amount: ", value);
	}

	// Delete the bet slip
	function deleteBetSlip(e) {

		// id = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.1_deleteBetButtonId"
		const key = this.id.replace('_deleteBetButtonId',''); // src, dst

		g_BetSlipSheet[key].parentElemRef.remove(); // remove element from DOM

		delete g_BetSlipSheet[key]; // remove the prop from the object

		updateProfitLossDisplay(); // display profit and loss for each players
	}

	// Update the profit and loss for each players 
	function updateProfitLossDisplay() {
		let stakeValue = 0;
		let profitLiabilityValue = 0;
		let loss = 0;
		const playerCount = g_CurrentDisplayedMatch.playerCount;

		let playerProfitLoss = [...Array(playerCount).fill(0)];
		for(let i = 0; i < playerCount; ++i) {
			// explore the full bet slip
			Object.keys(g_BetSlipSheet).forEach((key) => {
				// key = "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0"
				if(g_CurrentDisplayedMatch.idString && g_CurrentDisplayedMatch.idString === g_BetSlipSheet[key].eventinfo.evtStr) {
					
					g_BetSlipSheet[key].playerinfo.odd = Number(document.getElementById(key +'_oddValueId').value);

					if("players."+i  === g_BetSlipSheet[key].playerinfo.playerIndexString) // "players.0"
					{
						stakeValue = Number(document.getElementById(key +'_stakeValueId').value);
						profitLiabilityValue = Number(document.getElementById(key +'_profitLiabilityValueId').value);

						if(stakeValue && profitLiabilityValue) {
							if(g_BetSlipSheet[key].playerinfo.betType === "backOdds") {
								playerProfitLoss[i] += profitLiabilityValue;
								loss -= stakeValue;
							}
							else {
								playerProfitLoss[i] -= profitLiabilityValue;
								loss += stakeValue;
							}
						}
					}
					else {
						// playerProfitLoss[i] = loss;
						stakeValue = Number(document.getElementById(key +'_stakeValueId').value);
						if(g_BetSlipSheet[key].playerinfo.betType === "layOdds")  stakeValue = -stakeValue;
						playerProfitLoss[i] -= stakeValue;
					}
				}
			});
		}

		let winLossId = null;

		for(let i = 0; i < playerCount; ++i) {
			// finalStr => horseRace.uk.Cartmel.2021-09-20.12:00.players.0.winLossValueId 
			winLossId = g_CurrentDisplayedMatch.idString + '.players.' + i + '.winLossValueId';
			winLossElementColor(winLossId,  playerProfitLoss[i]);
		}
	}

	// Colored win/loss display
	function winLossElementColor(elementId, amount) {
		const elemRef = document.getElementById(elementId);
		amount = amount.toFixed(2);

		if(Number(amount) < 0)
		{
			elemRef.style.color = 'red';
			elemRef.innerHTML = '= - £' + (-amount);
		}
		else {
			elemRef.style.color = 'green';
			elemRef.innerHTML = '= + £'+ amount;
		}
	}

	// Calculate and auto fill the input fields
	function fillInputFields(elementId, numValue, playercount) {

		numValue = Number(numValue);

		if (typeof numValue === 'number') {
			let backLay = 0;
			let stake = 0;
			let profitLiability = 0;
			let lastWord = null;

			// Extract the last word by '_'
			// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0_stakeValueId" => stakeValueId
			lastWord = elementId.split("_").splice(-1)[0];

			// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0_stakeValueId" =>  "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0"
			// var test = elementId.split(/.*_/g);
			let withoutLastWord = elementId.substr(0, elementId.lastIndexOf('_'));

			const oddValueId    = withoutLastWord + '_oddValueId';
			const stakeValueId  = withoutLastWord + '_stakeValueId';
			const profitLiabilityValueId = withoutLastWord + '_profitLiabilityValueId';
			
			// remove last 2 words (backOdds.0)
			// "horseRace.uk.Cartmel.2021-09-20.12:00.players.0.backOdds.0 => 'horseRace.uk.Cartmel.2021-09-20.12:00.players.0'
			const withoutLast2Words = withoutLastWord.split('.').slice(0, -2).join('.');
			const winLossValueId = withoutLast2Words + '.winLossValueId';

			const isBackBet = withoutLastWord.split('.').splice(-2)[0] === 'backOdds' ? true : false;

			backLay = Number(document.getElementById(oddValueId).value);
			stake   = Number(document.getElementById(stakeValueId).value);
			profitLiability = Number(document.getElementById(profitLiabilityValueId).value).toFixed(2);

			// Minimum odd
			if(!backLay || backLay < 1.01) {
				backLay = 1.01;
			}


			if(lastWord === 'oddValueId') {
				profitLiability = stake * (numValue - 1);
				document.getElementById(profitLiabilityValueId).value = profitLiability.toFixed(2);
			}
			else if(lastWord === 'stakeValueId') {
				profitLiability = numValue * (backLay - 1);
				document.getElementById(profitLiabilityValueId).value = profitLiability.toFixed(2);
			}
			else if(lastWord === 'profitLiabilityValueId') {
				stake = numValue / (backLay - 1);
				document.getElementById(stakeValueId).value = stake.toFixed(2);
			}

			updateProfitLossDisplay(); // display profit and loss for each players
		}
		else console.error("Invalid number: ", numValue);
	}


	// Read the input box value
	function onInputValueUpdated(e) {

		const numValue = Number(e.target.value);
		if (typeof numValue === 'number') {
			fillInputFields(this.id, numValue, Number(e.currentTarget.dataset.playercount));
		}
		else console.error("Invalid number: ", numValue);
	}

	// Correct the odd value on focus out
	function onInputFocusoutMinOddCorrection(e) {

		let backLay = Number(e.target.value);
		if (typeof backLay === 'number') {
				// Minimum odd
			if(!backLay || backLay < 1.01) {
				backLay = 1.01;
				document.getElementById(this.id).value = backLay;
			}

			fillInputFields(this.id, backLay, Number(e.currentTarget.dataset.playercount));
		}
		else console.error("Invalid number: ", backLay);
	}
	////////////////// stack addition and subtraction (end) ////////////////////////////////////////////////////////////

	//////////////// TEST the bet request(start)////////////////////////////////////////////////////////////////////////
	function test_betRequest() {
		let betOdd = 1;
		let betOdds = [1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.50];
		let keyStr = 'horseRace.uk.Cartmel.2021-09-20.12:00.players.'; // 0.backOdds.1
		let nPlayers = g_CurrentDisplayedMatch.playerCount || 0;
		let betType = ['backOdds', 'layOdds'];
		let stakevalue = 1;

		let player = 0;
		let betTypeIdx = 0;
		let oddRangeIdx = 0;

		let betstr = null;
		let oddstr = null;
		let betChoice = null;
		let profitliabilityvalue = 0;

		// Sequential bet placement - test
		/*
		setInterval(() => {
			++betOdd;
			betstr = keyStr + player;
			oddstr = betstr + '.' + betType[betTypeIdx] + '.' + oddRangeIdx;
			betChoice = betType[betTypeIdx];
			profitliabilityvalue = Number((stakevalue * (betOdd - 1)).toFixed(2));


			if(betTypeIdx == 1 && oddRangeIdx == 2) { // layOdds
				player = ++player % nPlayers;
				betTypeIdx = 0;
				oddRangeIdx = 0;
			}
			else if(oddRangeIdx == 2) { // backOdds
				oddRangeIdx = 0;
				betTypeIdx = ++betTypeIdx % 2;
			}
			else {
				++oddRangeIdx;
			}

			sendBetRequest(betstr, oddstr, betOdd, stakevalue, profitliabilityvalue, betChoice);

		}, 1);
		*/

		// Random ordered bet placement - test
		setInterval(() => {
			betOdd = betOdds[randomIntFromInterval(0,betOdds.length-1)]; // randomly pick predefined odds
			betstr = keyStr + player;
			oddstr = betstr + '.' + betType[betTypeIdx] + '.' + oddRangeIdx;
			betChoice = betType[betTypeIdx];
			profitliabilityvalue = Number((stakevalue * (betOdd - 1)).toFixed(2));

			betTypeIdx  = randomIntFromInterval(0,1);
			oddRangeIdx = randomIntFromInterval(0,2);
			player = randomIntFromInterval(0, nPlayers-1);

			sendBetRequest(betstr, oddstr, betOdd, stakevalue, profitliabilityvalue, betChoice);

		}, 500);
	}

	// setTimeout(() => {
	// 	test_betRequest();
	// }, 5000);

	//////////////// TEST bet request(end)//////////////////////////////////////////////////////////////////////////////

	////////////////////////////////////////////////// win  predictor graphics animation (start) /////////////////////////

	function winPredictorScroller(currentDisplayedMatch) {

		if(!currentDisplayedMatch.playerInfo) return;

		const nPlayers = currentDisplayedMatch.playerInfo.length; // playerInfo. 
		let elemRef = null;
		let elemRef2 = null;
		let str = null;

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id","gameSimulatorContainer");
		document.getElementById("gameSimulatorWrapper").appendChild(elemRef);
	
		elemRef = document.createElement("DIV");
		elemRef.setAttribute("class","wrapperRandomPick");
		elemRef.setAttribute("id","myParentId_gameSimulatorContainer_myId_0");
		document.getElementById("gameSimulatorContainer").appendChild(elemRef);
	
		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id","shuffleItemsContainerId");
		elemRef.setAttribute("class","shuffleItemsContainer gridColumnLayout gridCenterVH");
		// elemRef.classList.add('gridColumnLayout_'+nPlayers); // .gridColumnLayout_6
		str = "repeat("+ nPlayers +", 1fr)";
		elemRef.style.gridTemplateColumns = str;  // grid-template-columns: repeat(6, 1fr);
		document.getElementById("myParentId_gameSimulatorContainer_myId_0").appendChild(elemRef);

		// player silk list
		for(let i = 0, n = nPlayers; i < n; ++i) {
			elemRef = document.createElement("DIV");
			if(i + 1 == n) elemRef.setAttribute("id","shuffleLastItemId"); // last element id for marking end point
			document.getElementById("shuffleItemsContainerId").appendChild(elemRef);
		
			elemRef2 = document.createElement("IMG");
// 			str = "assets/silk/silk_" + i + ".png";
			elemRef2.setAttribute("src",currentDisplayedMatch.playerInfo[i].silk); // image url
			elemRef2.setAttribute("alt","Trulli");
			// elemRef.setAttribute("id","myParentId_myParentId_shuffleItemsContainerId_myId_5_myId_6");
			elemRef.appendChild(elemRef2);
		}

		elemRef = document.createElement("DIV");
		elemRef.setAttribute("class","pickerBox gridColumnLayout gridCenterVH");
		// elemRef.classList.add('gridColumnLayout_'+nPlayers); // .gridColumnLayout_6
		str = "repeat("+ nPlayers +", 1fr)";
		elemRef.style.gridTemplateColumns = str;  // grid-template-columns: repeat(6, 1fr);
		elemRef.setAttribute("id","myParentId_myParentId_gameSimulatorContainer_myId_0_myId_12");
		document.getElementById("myParentId_gameSimulatorContainer_myId_0").appendChild(elemRef);
	
		elemRef = document.createElement("DIV");
		elemRef.setAttribute("id","pickerBoxOneId");
		elemRef.setAttribute("class","overItem");
		document.getElementById("myParentId_myParentId_gameSimulatorContainer_myId_0_myId_12").appendChild(elemRef);
	}
	////////////////////////////////////////////////// win  predictor graphics animation (end) /////////////////////////
   
	////////////////////////////////////////////////// win predictor animation (start ) //////////////////////////////////////////

		function translationAnimation(containerElementId, sliderObjs, winnerPlayer) {
			let shuffleItemsContainer = document.querySelector('#'+containerElementId);
			let children = shuffleItemsContainer.children; // gets array of children from the parent

			let startPos = children[0].offsetLeft;
			let endPos = children[children.length -  1].offsetLeft - startPos; // containerWidth - shuffleItemWidth;

			let sliderObjects = []; // array of objects
			for (let key in sliderObjs) {
				if (sliderObjs.hasOwnProperty(key)) {
					let obj = {};
					obj.sliderElement = document.querySelector('#'+key);  // slider element
					obj.stopPos = children[sliderObjs[key]].offsetLeft - startPos; // stop position in pixels
					obj.isForwardMove = true;
					obj.isFinalPositionReached = false;
					obj.currentPos = 0;
					obj.delta = randomIntFromInterval(20, 40); // speed of movement = 18; // 
					// obj.delta = randomIntFromInterval(60, 90); // speed of movement = 18; // 
					obj.timeout = randomIntFromInterval(3500, 4500); // between 3 and 5 seconds = 4801; // 
					// obj.timeout = randomIntFromInterval(3000, 9000); // between 3 and 9 seconds = 4801; // 
					sliderObjects.push(obj);
					console.log(`delta: ${obj.delta}, timeout: ${obj.timeout}`);
				}
			}


			let arrayIndex = 0;
			let arrayLength = sliderObjects.length;
			let countFinalPositionReached = 0;
			let startTimeStamp; //  = window.performance.now();
			
			
			function callbackLoop(currentTimeStamp) {
				if (startTimeStamp === undefined) startTimeStamp = currentTimeStamp;
				let elapsed = currentTimeStamp - startTimeStamp;
				
				if(!sliderObjects[arrayIndex].isFinalPositionReached) {
					if(sliderObjects[arrayIndex].isForwardMove) {
						// currentPos += elapsed * 0.01;
						sliderObjects[arrayIndex].currentPos += sliderObjects[arrayIndex].delta;
						if(sliderObjects[arrayIndex].currentPos < endPos) {
							sliderObjects[arrayIndex].sliderElement.style.transform = 'translateX(' + sliderObjects[arrayIndex].currentPos + 'px)';
						}
						else {
							sliderObjects[arrayIndex].isForwardMove = false;
							sliderObjects[arrayIndex].sliderElement.style.transform = 'translateX(' + endPos + 'px)';
						}
					}
					else {
						// currentPos -= elapsed * 0.01;
						sliderObjects[arrayIndex].currentPos -= sliderObjects[arrayIndex].delta;
						if(sliderObjects[arrayIndex].currentPos > 0) {
							sliderObjects[arrayIndex].sliderElement.style.transform = 'translateX(' + sliderObjects[arrayIndex].currentPos + 'px)';
						}
						else {
							sliderObjects[arrayIndex].isForwardMove = true;
							sliderObjects[arrayIndex].sliderElement.style.transform = 'translateX(' + 0 + 'px)';
						}
					}
				}

				if(!sliderObjects[arrayIndex].isFinalPositionReached && elapsed > sliderObjects[arrayIndex].timeout && 
					Math.abs(sliderObjects[arrayIndex].currentPos - sliderObjects[arrayIndex].stopPos) <= sliderObjects[arrayIndex].delta &&
					((sliderObjects[arrayIndex].isForwardMove && sliderObjects[arrayIndex].currentPos > sliderObjects[arrayIndex].stopPos) || 
					(!sliderObjects[arrayIndex].isForwardMove && sliderObjects[arrayIndex].currentPos < sliderObjects[arrayIndex].stopPos))) {
					sliderObjects[arrayIndex].isFinalPositionReached = true;
					++countFinalPositionReached;
					sliderObjects[arrayIndex].sliderElement.style.transform = 'translateX(' + sliderObjects[arrayIndex].stopPos + 'px)';
					// exit condition - after 3 sec
					if(arrayLength != countFinalPositionReached) window.requestAnimationFrame(callbackLoop);
					else {
						// declare the match winner
						document.getElementById("resultDeclarationWrapper").textContent = "WINNER: " + winnerPlayer; // "Winner: Team Ethereal !!!";
						updateBalanceAfterResult();
					}
				}
				else {
					arrayIndex = ++arrayIndex % arrayLength;
					window.requestAnimationFrame(callbackLoop);
				}
			}
			window.requestAnimationFrame(callbackLoop);
		}

	////////////////////////////////////////////////// win predictor animation (end) ///////////////////////////////////

	//////////////////////////////////////////////// Digital Clock Countdown (start) ///////////////////////////////////
	let runClockCounter = true;
	let mins = 5;
	let sec = mins * 60;
	let clockStr = null;

	var last = 0; // timestamp of the last render() call
	function countdownClock(now) {
		if(!last || now - last >= 0.01 *1000) { // 0.01 sec elapsed time between the calls
			last = now;

			clockStr =  ("0" + (sec < 0 ? 0 : Math.floor(sec / (60 * 1)))).slice(-2)   + 
						' : ' + 
						("0" + (sec % 60 + 1)).slice(-2);

			document.getElementById("digitalClock").textContent = clockStr;

			if(--sec == -2) {
				runClockCounter = false;
				document.getElementById("marketStatusId").classList.remove('blink_me');
				document.getElementById("marketStatusId").textContent = "NO MORE BETS";
				setTimeout(()=> {
					setTimeout(()=> {
						document.getElementById("digitalClock").textContent = "MATCH GOING TO START SOON!!!";
						document.getElementById("digitalClock").classList.add('blink_me');

						setTimeout(()=> {
							document.getElementById("digitalClock").classList.remove('blink_me');
							document.getElementById("digitalClock").textContent = "MATCH STARTED !!!";

							// List players silk for slide over animation
							winPredictorScroller(g_CurrentDisplayedMatch); // nPlayers
							//  player who won's the match
							translationAnimation('shuffleItemsContainerId', { "pickerBoxOneId": g_CurrentDisplayedMatch.winData.winnerIndex || 0}, g_CurrentDisplayedMatch.winData.horseName);  // where to stop the slider 
						}, 5000);
					}, 1000);
				}, 1000);
			}
		}
		if(runClockCounter) requestAnimationFrame(countdownClock);
	}

	//////////////////////////////////////////////// Digital Clock Countdown (end) ///////////////////////////////////

	//////////////////////////////// Tester (start) ////////////////////////////////////////////////////////////////////

	function run() {
		const elem = document.getElementById('publishResultId');
		elem.addEventListener('click', publishResult); // works
	}
	run();

	function publishResult(e) {

		sendEventResultRequest();

// 		console.log(this);
// 		console.log(e.currentTarget); // element you clicked
	}

	// Send a bet request to the server
	function sendEventResultRequest() {
		(async () => {
			const res = await fetch('/api/publishResult', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					msg: 'PUBLISH_THE_MATCH_WINNER'
				})
			}).then((res) => res.json());

			if (res.status === 'ok') {
				// everything went fine
				console.log("Match Winner Recieved Successfully");
				console.log(res.data);

				g_CurrentDisplayedMatch.winData = res.data.winData;
				
				// Start Win perdition animation
				setTimeout(()=> {
					countdownClock();
					document.getElementById("marketStatusId").textContent = "MARKET CLOSING DOWN SOON.....";
				}, 2000);


			} else {
				console.error("Bet Placed Error: ", res.error);
				// alert(res.error);
			}
		})();
	}

	// Update the balance after the match result
	async function updateBalanceAfterResult() {
		const username = localStorage.getItem('username'); // get it from cookie
		const password = localStorage.getItem('password'); // get it from cookie
		if(username && username) {
			
			const result = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username,
					password
				})
			}).then((res) => res.json());

			if (result.status === 'ok') {
				// everything went fine
				console.log('Got the token: ', result.data);
				localStorage.setItem('token', result.data); // store in cookie
				localStorage.setItem('username', username); // store in cookie
				localStorage.setItem('password', password); // store in cookie
				// alert('Success');
				document.getElementById("regLoginFieldsId").style.display = 'none';
				document.getElementById("welcomeUserName").textContent = "Welcome " + username;
				document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
			} else {
				alert(result.error);
			}
		}
	}
	/////////////////////////////// Tester (end) ///////////////////////////////////////////////////////////////////////
});