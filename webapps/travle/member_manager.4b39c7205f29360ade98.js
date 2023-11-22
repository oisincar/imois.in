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
/***/ (function() {

eval("var __values = (this && this.__values) || function(o) {\n    var s = typeof Symbol === \"function\" && Symbol.iterator, m = s && o[s], i = 0;\n    if (m) return m.call(o);\n    if (o && typeof o.length === \"number\") return {\n        next: function () {\n            if (o && i >= o.length) o = void 0;\n            return { value: o && o[i++], done: !o };\n        }\n    };\n    throw new TypeError(s ? \"Object is not iterable.\" : \"Symbol.iterator is not defined.\");\n};\nconsole.log(\"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\");\nvar keyLocalStorageKey = 'travle-member-key';\n// If we've found the key in the browser url query, use and save that.\nvar userKey = new URLSearchParams(window.location.search).get('key');\nif (userKey) {\n    // Save it\n    localStorage.setItem(keyLocalStorageKey, userKey);\n}\nelse {\n    // Try find it in localStorage.\n    userKey = localStorage.getItem(keyLocalStorageKey);\n}\nfunction setAdDivEnabled(enable) {\n    var e_1, _a;\n    // To disable the divs, set the height to 0.\n    // To enable the divs, clear the style by setting the height to null.\n    var h = enable ? null : '0';\n    try {\n        for (var _b = __values(['ad-header-container', 'ad-content-1-container']), _c = _b.next(); !_c.done; _c = _b.next()) {\n            var divClassId = _c.value;\n            var div = document.getElementById(divClassId);\n            div.style.minHeight = h;\n        }\n    }\n    catch (e_1_1) { e_1 = { error: e_1_1 }; }\n    finally {\n        try {\n            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);\n        }\n        finally { if (e_1) throw e_1.error; }\n    }\n}\n// If we've a key, validate it.\nif (userKey) {\n    // To make the page load more smoothly, just assume the key will be valid and set the\n    // min-heights of the ad divs to 0.\n    setAdDivEnabled(false);\n    var data = { key: userKey };\n    // Make API call to 'https://members.travle.xyz'\n    fetch('https://members.travle.xyz/is_valid_key', {\n        method: 'POST',\n        headers: {\n            'Content-Type': 'application/json'\n        },\n        body: JSON.stringify(data)\n    })\n        .then(function (response) {\n        if (response.ok) {\n            return response.json(); // Parse JSON response\n        }\n        else {\n            throw new Error('API call failed');\n        }\n    })\n        .then(function (jsonData) {\n        if (jsonData && jsonData.is_valid !== undefined) {\n            // Handle 'is_valid' boolean value from the API response\n            if (jsonData.is_valid) {\n                console.log('User key is valid');\n            }\n            else {\n                // Invalid key: Remove it from localstorage.\n                localStorage.removeItem(keyLocalStorageKey);\n                console.log('User key is not valid');\n                setAdDivEnabled(true);\n                loadAds();\n            }\n        }\n        else {\n            throw new Error('Invalid response format');\n        }\n    })\n        .catch(function (error) {\n        // Handle API call failure\n        console.error('API call error:', error);\n        // If the API is down or broken, just assume the user has a valid key... FOR NOW!!\n        // setAdDivEnabled(true);\n        // loadAds();\n    });\n}\nelse {\n    loadAds();\n}\nfunction loadAds() {\n    console.log(\"----- Loading ADS -----\");\n    // Insert script tag into the head of the HTML page\n    var script = document.createElement('script');\n    script.src = 'https://cdn.fuseplatform.net/publift/tags/2/3347/fuse.js';\n    script.async = true;\n    document.head.appendChild(script);\n}\n\n\n//# sourceURL=webpack://EntryPoint/./src/ts/member_management_preload.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/ts/member_management_preload.ts"]();
/******/ 	EntryPointmember_manager = __webpack_exports__;
/******/ 	
/******/ })()
;