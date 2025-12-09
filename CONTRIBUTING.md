# Contributing Guidelines

Thank you for considering contributing to **Explain It to Me – AI Text Simplifier**!
We welcome all improvements—bug fixes, new features, UI enhancements, documentation updates, and ideas.

---

## 🚀 How to Contribute

### 1. **Fork the Repository**

Click the **Fork** button at the top right of the GitHub page to create your own copy of the project.

---

### 2. **Clone Your Fork**

```bash
git clone git@github.com:esphere-tech/explain-it-to-me.git
cd explain-it-to-me
```

---

### 3. **Create a Feature Branch**

Use clear and descriptive branch names:

```bash
git checkout -b feature/your-feature-name
```

Examples:

* `feature/add-dark-theme`
* `fix/modal-overflow-bug`
* `ui/improve-animations`

---

## 🛠️ Development Setup

### Required steps:

1. Install dependencies (if any)
2. Add icons to `/icons`
3. In `background.js`, replace:

   ```
   YOUR_PRECONFIGURED_API_KEY_HERE
   ```

   with your own API key

### Load the extension in Chrome:

1. Open: `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder

---

## ✔️ Coding Standards

To keep code consistent:

* Use clear, readable variable names
* Comment complex logic
* Keep UI styling clean and responsive
* Do not commit your API key
* Follow existing project structure

---

## 🧪 Testing Your Changes

Before submitting:

* Test the extension in Chrome
* Ensure context menus still work
* Verify explanations load smoothly
* Check that no console errors appear
* Test all four explanation levels

---

## 📥 Submitting a Pull Request

When you're ready:

1. Push your branch:

   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a **Pull Request** on GitHub
3. Include:

   * A clear title
   * A description of what you changed
   * Screenshots (if UI-related)

We aim to review PRs within **3–5 days**.

---

## 🐞 Reporting Issues

If you find a bug or security issue:

* Open a **GitHub Issue**
* Describe the problem clearly
* Include steps to reproduce
* Attach screenshots if helpful

Security-related issues can be submitted privately if needed.

---

## ❤️ Thank You

Your contributions make this project better for everyone.
We appreciate your help in improving learning and accessibility on the web!
