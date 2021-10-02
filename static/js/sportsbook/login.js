window.addEventListener('load', function () {
	const loginBtn = document.getElementById("logInId");
		  loginBtn.addEventListener('click', loginUser);
	const joinBtn = document.getElementById("joinNowId");
		  joinBtn.addEventListener('click', registerUser);

	// log in
	async function loginUser(event) {
		event.preventDefault();
		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;

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
			alert('Success');
			document.getElementById("regLoginFieldsId").style.display = 'none';
			document.getElementById("welcomeUserName").textContent = "Welcome " + username;
			document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
		} else {
			alert(result.error);
		}
	}

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
			alert('Success');

			document.getElementById("regLoginFieldsId").style.display = 'none';
			document.getElementById("welcomeUserName").textContent = "Welcome " + username;
			document.getElementById("userBalanceAmount").textContent = "Balance: " + result.userBalance;
		} else {
			alert(result.error);
		}
	}
});