
// Load light/dark mode!



function isLightMode() {
    return localStorage.getItem('light') != null;
}

function setDarkMode() {
    localStorage.removeItem('light');
    document.documentElement.setAttribute('data-bs-theme', 'dark');

    if (DAY_NIGHT_SELECTOR != null) {
        DAY_NIGHT_SELECTOR.classList.replace('fa-sun', 'fa-moon');
    }
}

function setLightMode() {
    localStorage.setItem('light', true);
    document.documentElement.setAttribute('data-bs-theme', 'light');

    if (DAY_NIGHT_SELECTOR != null) {
        DAY_NIGHT_SELECTOR.classList.replace('fa-moon', 'fa-sun');
    }
}

// Expects selector by name:
var DAY_NIGHT_SELECTOR = document.getElementById("day-night-selector");

// Autoload...
if (isLightMode()) {
    setLightMode();
}
