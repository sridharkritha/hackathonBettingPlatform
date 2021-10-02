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

	// log in
	async function loginUser(event) {
		event.preventDefault();
		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;
		login(username, password);
	}

	// Auto login on refresh
	function autoLoginAfterRefresh() {
		const username = localStorage.getItem('username'); // get it from cookie
		const password = localStorage.getItem('password'); // get it from cookie
		if(username && username) login(username, password);
	}
	autoLoginAfterRefresh();

	// new user registration
	async function registerUser(event) {
		event.preventDefault();
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
			localStorage.setItem('token', result.data); // store in cookie
			localStorage.setItem('username', username); // store in cookie
			localStorage.setItem('password', password); // store in cookie
			alert('Success');

			document.getElementById("regLoginFieldsId").style.display = 'none';
			document.getElementById("welcomeUserName").textContent = "Welcome " + username;
			document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
		} else {
			alert(result.error);
		}
	}
});