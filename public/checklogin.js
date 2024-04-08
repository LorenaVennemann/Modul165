const username = window.localStorage.getItem("username")
const password = window.localStorage.getItem("password")
console.log(username, password)
if(!username || !password) {
    location.href = "/login"
}