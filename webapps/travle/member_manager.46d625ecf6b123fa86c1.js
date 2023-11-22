/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
var EntryPointmember_manager;
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/ts/member_management_preload.ts":
/*!*********************************************!*\
  !*** ./src/ts/member_management_preload.ts ***!
  \*********************************************/
/***/ (() => {

eval("console.log(\"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\");\nconsole.log(\"Looking for membership\");\n// If we've found the key in the browser url query, use and save that.\nvar userKey = new URLSearchParams(window.location.search).get('key');\nif (userKey) {\n    // Save it\n    localStorage.setItem('travle-member-key', userKey);\n}\nelse {\n    // Try find it in localStorage.\n    userKey = localStorage.getItem('travle-member-key');\n}\n// If we've a key, validate it.\n// If it's invalid\nif (userKey) {\n    // If 'travle-member-key' exists in localStorage\n    var data = { key: userKey };\n    // Make API call to 'https://members.travle.xyz'\n    fetch('https://members.travle.xyz', {\n        method: 'POST',\n        headers: {\n            'Content-Type': 'application/json'\n        },\n        body: JSON.stringify(data)\n    })\n        .then(function (response) {\n        if (response.ok) {\n            return response.json(); // Parse JSON response\n        }\n        else {\n            throw new Error('API call failed');\n        }\n    })\n        .then(function (jsonData) {\n        if (jsonData && jsonData.is_valid !== undefined) {\n            // Handle 'is_valid' boolean value from the API response\n            if (jsonData.is_valid) {\n                console.log('User key is valid');\n            }\n            else {\n                console.log('User key is not valid');\n                loadAds();\n            }\n        }\n        else {\n            throw new Error('Invalid response format');\n        }\n    })\n        .catch(function (error) {\n        // Handle API call failure\n        console.error('API call error:', error);\n        loadAds();\n    });\n}\nelse {\n    loadAds();\n}\nfunction loadAds() {\n    // Insert script tag into the head of the HTML page\n    var script = document.createElement('script');\n    script.src = 'https://cdn.fuseplatform.net/publift/tags/2/3347/fuse.js';\n    script.async = true;\n    document.head.appendChild(script);\n}\n\n\n//# sourceURL=webpack://EntryPoint/./src/ts/member_management_preload.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/ts/member_management_preload.ts"]();
/******/ 	EntryPointmember_manager = __webpack_exports__;
/******/ 	
/******/ })()
;