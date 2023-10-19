let map;
let infoWindow;
let markers = [];
// eslint-disable-next-line
function initMap() {
  let sanMateo = { lat: 37.563, lng: -122.3255 };
  // eslint-disable-next-line
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 11,
    center: sanMateo,
    mayTypeId: "roadmap",
  });
  // eslint-disable-next-line
  infoWindow = new google.maps.InfoWindow();
}

const getStores = () => {
  const zipCode = document.getElementById("zip-code").value;

  if (!zipCode || zipCode.length != 5 || !isStringDigits(zipCode)) {
    clearLocations();
    InvalidZipCode();
    return;
  }
  // I noticed there is two API urls (API_URL and API_URL2), maybe adding a more descriptive name can help in 
  // differentiating then. For example, STORES_API_URL and ZIP_COUNT_API_URL.
  const API_URL = "https://coffeelocator.onrender.com/api/stores?";

  fetch(
    API_URL +
      new URLSearchParams({
        zip_code: zipCode,
      })
  )
    .then((response) => {
      if (response.status == 200) {
        return response.json();
      } else {
        throw new Error("No stores found");
      }
    })
    .then((data) => {
      const { stores } = data;

      if (stores.length > 0) {
        clearLocations();
        searchLocationNear(stores);
        setStoresList(stores);
        setOnClickListener();
      } else {
        clearLocations();
        noStoresFound();
      }
    })
    .catch(() => {
      clearLocations();
      InvalidZipCode();
      return;
    });
};

const getZipCount = () => {
  const zipCode = document.getElementById("zip-code").value;
  const API_URL2 = "https://coffeelocator.onrender.com/api/zipcount?"; // the new API route
  fetch(
    API_URL2 +
      new URLSearchParams({
        zip_code: zipCode,
      })
  )
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error("Zip count not found");
      }
    })
    .then((data) => {
      const { updatedCount } = data;
      const updatedCountParagraph = document.getElementById("updated-count");
      updatedCountParagraph.textContent =
        "This has been searched for " + updatedCount + " times! ";
    })
    .catch(() => {
      clearLocations();
      InvalidZipCode();
      return;
    });
};
// For the two functions above, I like how you've employed promise chaining with .then() and .catch() in the getStores() function. 
// It's interesting to see another way of implementing asynchronous operations like the async/await syntax. 
// It gives a clear sequence to the process, making it straightforward and easy to understand. For example, I am able to understand
// that the getStores() function retrieves the ZIP code, fetches related store data via an API, processes and displays the results/messages, 
// and handles any errors if no zip is found. Great job on that!

// I like how you created a separate function that handles the displaying of data. 
// This approach helps keep the code clean and allows for reuse in multiple parts of the code.
const setStoresList = (stores) => {
  let storesHtml = ``;
  stores.forEach((store, index) => {
    storesHtml += `        
      <div class="store-container">
          <div class="store-container-background">
            <div class="store-info-container">
              <div class="store-address">
                <span>${store.addressLines[0]}</span>
                <span>${store.addressLines[1]}</span>
              </div>
              <div class="store-phone-number">${store.phoneNumber}</div>
            </div>
            <div class="store-number-container">
              <div class="store-number">${index + 1}</div>
            </div>
          </div>
        </div>`;
  });
  document.querySelector(".stores-list").innerHTML = storesHtml;
};

const searchLocationNear = (stores) => {
  // eslint-disable-next-line
  let bounds = new google.maps.LatLngBounds();
  stores.forEach((store, index) => {
    // eslint-disable-next-line
    var latlng = new google.maps.LatLng(
      store.location.coordinates[1],
      store.location.coordinates[0]
    );
    let name = store.storeName;
    let address = store.addressLines[0];
    let openStatusText = store.openStatusText;
    let phoneNumber = store.phoneNumber;
    bounds.extend(latlng);
    createMarker(latlng, name, address, index + 1, openStatusText, phoneNumber);
  });
  map.fitBounds(bounds);
};

const setOnClickListener = () => {
  let storeElements = document.querySelectorAll(".store-container");
  storeElements.forEach((element, index) => {
    element.addEventListener("click", () => {
      // eslint-disable-next-line
      google.maps.event.trigger(markers[index], "click");
    });
  });
};

const createMarker = (
  latlng,
  name,
  address,
  storeNumber,
  openStatusText,
  phoneNumber
) => {
  let html = `
    <div class="store-info-window">
      <div class="store-info-name">
        ${name}
      </div>
      <div class="store-info-open-status">
        ${openStatusText}
      </div>
      <div class="store-info-address">
        <div class="icon">
          <i class="fas fa-location-arrow"></i>
        </div>
        <span>
          ${address}
        </span>
      </div>
      <div class="store-info-phone">
        <div class="icon">
          <i class="fas fa-phone-alt"></i>
        </div>
        <span>
          <a href="tel:${phoneNumber}"> ${phoneNumber} </a>
        </span>
      </div>
    </div>
  `;
  // eslint-disable-next-line
  let marker = new google.maps.Marker({
    position: latlng,
    map: map,
    label: `${storeNumber}`,
  });

  // eslint-disable-next-line
  google.maps.event.addListener(marker, "click", () => {
    infoWindow.setContent(html);
    infoWindow.open(map, marker);
  });
  markers.push(marker);
};

const clearLocations = () => {
  infoWindow.close();
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;
};

const noStoresFound = () => {
  const html = `<div class="no-stores-found">No Stores Found</div>`;
  document.querySelector(".stores-list").innerHTML = html;
};

const InvalidZipCode = () => {
  const html = `<div class="invalid-zip-code">Invalid Zip Code</div>`;
  document.querySelector(".stores-list").innerHTML = html;
};

const isStringDigits = (inputString) => {
  for (let i = 0; i < inputString.length; i++) {
    if (!/^\d$/.test(inputString[i])) {
      return false;
    }
  }
  return true;
};

const inputElement = document.getElementById("zip-code");
inputElement.addEventListener("keyup", function (event) {
  // Check if a specific key is pressed (e.g., Enter key with keyCode 13)
  if (event.key == "Enter") {
    // Call your function here or perform any desired action
    getStores(); // Call the stores API
    getZipCount(); // Call the zip count API
  }
});

const searchButton = document.getElementById("search-button");
searchButton.addEventListener("click", function () {
  getStores(); // Call the stores API
  getZipCount(); // Call the zip count API
});
