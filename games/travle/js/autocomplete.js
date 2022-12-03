'use strict';

// NOTE to future me... This is some hacky crap. Not reusable, can't have multiple in one page etc.
class AutocompleteDropDown {
  constructor(autocomplete_options) {
    this.autocomplete_options = autocomplete_options;

    console.log("Loading!");
    this.countriesInput = document.querySelector('.countries-input');
    this.countriesList = document.querySelector('.countries-list');
    this.countriesListContainer = document.querySelector('.countries-list-container');

    this.generateCountriesList(this.countriesInput.value);

    this.countriesInput.addEventListener('keyup', (e) => { this.generateCountriesList(this.countriesInput.value); });

    this.countriesInput.addEventListener('focus', () => {
      // We don't always update the countries when the dropdown is closing, so make sure
      // we're up to date here.
      // this.filterCountriesOnChange({ target: { value } });
      this.countriesListContainer.classList.add('visible');
    });

    this.countriesInput.addEventListener('blur', (event) => {
      this.countriesListContainer.classList.remove('visible');
    });
  }

  addEventListenerToCountries() {
    // const countriesInput = document.querySelector('.countries-input');
    const countryListItems = document.querySelectorAll('.country');
    let countryListItemIndex = 0;
    const countryListItemILength = countryListItems.length;

    for (countryListItemIndex; countryListItemIndex < countryListItemILength; countryListItemIndex++) {
      const countryListItem = countryListItems[countryListItemIndex];

      countryListItem.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const value = event.currentTarget.innerText;
        this.countriesInput.value = value;

        this.generateCountriesList(value);

        this.countriesInput.blur();
      });
    }
  }

  createCountryListItem(country, search_term) {
    // just assume for now it'll be one block...

    var ix = country.toLowerCase().indexOf(search_term);
    var l = search_term.length;
    var p1 = country.slice(0, ix);
    var p2 = country.slice(ix, ix+l);
    var p3 = country.slice(ix+l);

    var c = `${p1}<b>${p2}</b>${p3}`;

    return `<div class="country" data-value="${c}"<span class="country--name">${c}</span></li>`;
  }

  generateCountriesList(search_term) {
    search_term = search_term.toLowerCase();

    var matching_countries = [];
    if (search_term == "") {
      matching_countries = this.autocomplete_options;
    }
    else {
      // Prioritize results which match at the start.
      var matches_start = [];
      var matches_any = [];

      for (const country of this.autocomplete_options) {
        var ix = country.toLowerCase().indexOf(search_term);

        if (ix == 0) {
          matches_start.push(country);
        }
        else if (ix > 0) {
          matches_any.push(country);
        }
      }

      matches_start.sort();
      matches_any.sort();

      matching_countries = matches_start.concat(matches_any);
    }

    this.countriesList.innerHTML = '';

    for (const country of matching_countries) {
      this.countriesList.innerHTML += this.createCountryListItem(country, search_term);
    }

    this.addEventListenerToCountries();
  }

}
