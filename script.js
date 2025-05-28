const form = document.querySelector('.my-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

form.addEventListener('submit',(e)=> {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    console.log('Username', username);
    console.log('Password', password);

    if(username === 'admin' && password == '1234') {
        alert('Login successful');
    }
    else {
        alert('Invalid credentials');
        usernameInput.style.border = "2px solid red";
        passwordInput.style.border = "2px solid red";
    }


});

