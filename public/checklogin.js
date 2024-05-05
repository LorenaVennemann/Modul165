const username = window.localStorage.getItem("username")
const password = window.localStorage.getItem("password")
if(!username || !password || username === "undefined" || password === "undefined") {
    location.href = "/login"
}