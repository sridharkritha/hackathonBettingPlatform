let   g_UserName = null;

window.addEventListener('load', function () {
	const loginBtn = document.getElementById("logInId");
		  loginBtn.addEventListener('click', loginUser);
	const joinBtn = document.getElementById("joinNowId");
		  joinBtn.addEventListener('click', registerUser);


	// login method
	async function login(username, password) {
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

			// Cookie - save & access
			g_UserName = username;
			const cbAuthObj = localStorage.getItem('cbAuth'); // get it from cookie
			let storageObj = {};

			if(cbAuthObj) storageObj = JSON.parse(cbAuthObj);

			if(!cbAuthObj) {
				let obj = {};
				obj[username + '.token']    = result.data;
				obj[username + '.username'] = username;
				obj[username + '.password'] = password;

				localStorage.setItem('cbAuth', JSON.stringify(obj)); // store in cookie
			}
			else if(!storageObj[username + '.username']) {
				storageObj[username + '.token']    = result.data;
				storageObj[username + '.username'] = username;
				storageObj[username + '.password'] = password;

				localStorage.setItem('cbAuth', JSON.stringify(storageObj)); // store in cookie
			}

			// alert('Success');
			document.getElementById("regLoginFieldsId").style.display = 'none';
			document.getElementById("welcomeUserName").textContent = "Welcome " + username;
			document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
		} else {
			alert(result.error);
		}
	}

	// log in
	async function loginUser(event) {
		event.preventDefault();
		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;
		login(username, password);
	}

	// Auto login on refresh
	function autoLoginAfterRefresh() {
		if(g_UserName) {
			const username = localStorage.getItem(g_UserName +'.username'); // get it from cookie
			const password = localStorage.getItem(g_UserName +'.password'); // get it from cookie
			if(username && username) login(username, password);
		}
	}
	// autoLoginAfterRefresh();

	// new user registration
	async function registerUser(event) {
		event.preventDefault();
		// localStorage.clear();
		
		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;

		// sending request from client(browser) to server
		const result = await fetch('/api/register', {
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

			// Cookie - save & access
			g_UserName = username;
			const cbAuthObj = localStorage.getItem('cbAuth'); // get it from cookie
			let storageObj = {};

			if(cbAuthObj) storageObj = JSON.parse(cbAuthObj);

			if(!cbAuthObj) {
				let obj = {};
				obj[username + '.token']    = result.data;
				obj[username + '.username'] = username;
				obj[username + '.password'] = password;

				localStorage.setItem('cbAuth', JSON.stringify(obj)); // store in cookie
			}
			else if(!storageObj[username + '.username']) {
				storageObj[username + '.token']    = result.data;
				storageObj[username + '.username'] = username;
				storageObj[username + '.password'] = password;

				localStorage.setItem('cbAuth', JSON.stringify(storageObj)); // store in cookie
			}

			alert('Success');

			document.getElementById("regLoginFieldsId").style.display = 'none';
			document.getElementById("welcomeUserName").textContent = "Welcome " + username;
			document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
		} else {
			alert(result.error);
		}
	}
});