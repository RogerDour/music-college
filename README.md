# 🎵 Music College Platform (MVP in 30 Days)

A full-stack project to manage a small online music college. Built with **React**, **Node.js**, and **MongoDB**. This is part of my technical software engineering graduation project.

---

## 🔧 Project Structure

---

## 📅 Learning Log

Daily progress updates are included below ⬇️

---

## 📅 Day 1 – Login Page

This is a simple and stylish **Login Page** built using **HTML** and **CSS**. It’s part of my first day learning front-end web development after watching two tutorial videos.

---

## ✨ Features

- Clean and modern UI
- Blurred background with transparent login box
- Form fields for username and password
- "Remember me" checkbox
- "Forgot password" and registration links
- Responsive layout with flexbox

---

## 🛠️ Technologies Used

- HTML5
- CSS3 (with `backdrop-filter` and flexbox)

---

## ▶️ How to Run It

1. Download or clone the repository.
2. Make sure `style.css` and `login2.png` are in the same folder as your HTML file.
3. Open `index.html` in any web browser.

---

## 📚 What I Learned

- Creating a form layout with HTML
- Styling input boxes and buttons with CSS
- Using `flexbox` to center elements
- Applying transparent backgrounds and blur effects with `backdrop-filter`
- Handling links and hover effects

---

## 🚀 What's Next?

- Add JavaScript for basic form validation
- Make the login page responsive on smaller screens
- Explore connecting it to a backend in the future

---

## 📁 Folder Structure

---

## 📅 Day 2 – JavaScript Basics & DOM

### ✅ What I Did

- Learned JavaScript syntax: variables, functions, arrays, and objects
- Connected my login form to JavaScript
- Captured user input using the DOM
- Built a simple login logic with hardcoded credentials
- Used `event.preventDefault()` to control form behavior

### 💻 Code Features

- `form.addEventListener('submit', handler)`
- `input.value` to read form data
- Conditional logic to simulate login
- Alert on success/failure

### 🔍 What Was Tricky

- Understanding how form events work
- Remembering to select elements with `querySelector` and `getElementById`
- Using `.value` instead of `.innerText`

### 📈 Improvements for Later

- Add form validation (e.g., empty fields)
- Style error messages dynamically
- Replace fake login with real backend auth

### 📸 Screenshot

![Login Screenshot](screenshotday2.png)

---

## 📅 Day 3 – JavaScript Fundamentals (Practice Exercises)

> 📁 Practice code located in: [`js-practice/day3-basics.html`](./js-practice/day3-basics.html)

### ✅ What I Did

- Practiced JavaScript basics in a separate file
- Declared variables and logged output to the console
- Wrote functions and used return values
- Created and looped through an array of instrument names
- Defined a `student` object and accessed its properties
- Linked `script.js` to `index.html` and added a basic interactive button

### 💻 Code Features

- `console.log()` for debugging and output
- `function multiply(a, b)` to perform basic math
- `for` loop to iterate through arrays
- Object creation using `{ key: value }` syntax
- `addEventListener` for button click handling
- Simple DOM manipulation: `document.body.style.backgroundColor`

### 🔍 What Was Tricky

- Remembering syntax for loops and functions
- Understanding how and when to use `const` vs `let`
- Connecting a script file properly to HTML

### 📈 Improvements for Later

- Use these JavaScript fundamentals to enhance the login page
- Add form validation and input feedback
- Create dynamic UI updates (e.g., error messages, loading states)

---

## 📅 Day 4 – DOM & Event Handling (Practice)

> 📁 Practice code located in: [`js-practice/day4-dom.html`](./js-practice/day4-dom.html)

### ✅ What I Did

- Explored DOM manipulation in more depth
- Used JavaScript to dynamically update content
- Added multiple event listeners to buttons and inputs
- Practiced changing styles and toggling visibility

### 💻 Code Features

- `getElementById`, `querySelector`, and `innerText`
- Multiple `addEventListener` calls for different events
- Changing styles with `.style` and classList
- Showing/hiding elements with `display` or `visibility`

### 🔍 What Was Tricky

- Making sure events triggered in the right order
- Understanding event propagation and scope
- Debugging JavaScript without console errors

### 📈 Improvements for Later

- Use DOM skills for client-side form validation
- Animate transitions and interactions
- Implement keyboard event handling

---

## 📅 Day 5 – Project Skeleton & GitHub Workflow

### ✅ What I Did

- Restructured the project into `client/` and `server/` folders
- Moved all existing frontend files into `client/`
- Created `.gitignore` with common ignore rules
- Prepared for full-stack development with React and Node
- Updated file paths in HTML and organized codebase

### 💻 Code Features

- Updated paths in `index.html`:
  ```html
  <link rel="stylesheet" href="style.css" />
  <script src="script.js"></script>
  ```
