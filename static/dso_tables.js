/**
 * Fill the api table from https://api.data.amsterdam.nl/v1/
 * and https://map.data.amsterdam.nl/index.json.
 */

//const domain = window.location.origin;
const domain = "https://api.data.amsterdam.nl";
const dsoPath = "/v1/";
const mapDomain = "https://map.data.amsterdam.nl";
let tables = {
    "rest_apis": [],
    "geo_services": [],
    "tile_services": []
}

 function JSONRequest(url) {
    return new Promise(function(callback, err) {
        let http = new XMLHttpRequest();
        http.open("GET", url, true);
        http.send();
        http.onreadystatechange = function () {
            if (this.readyState == 4){
                if(this.status == 200) {
                    try {
                        let result = JSON.parse(this.responseText);
                        callback(result);
                    } catch (error) {
                        err("Error: JSON corrupt");
                    }
                } else {
                    err(this.response);
                }
            }
        }; 
    }); 
 }


// Convert index.json from map.data.amsterdam.nl. See tools/make_indexjson.py
// over at https://github.com/Amsterdam/mapserver.
function parseMapIndex(mapidx) {
    let geo = tables["geo_services"];
    for (const [key, value] of Object.entries(mapidx)) {
        let title = value.title || "";
        let displayTitle = title + (
            title.toLowerCase().includes(key) ? "" : " (" + key + ")"
        );

        geo.push({
            "api_urls": {
                "WMS": mapDomain + "/maps/" + key + "?REQUEST=GetCapabilities&VERSION=1.1.0&SERVICE=wms",
            },
            "beschikbaarheid": "Openbaar",
            "beschrijving": value.abstract,
            "documentatie_urls": {},
            "licentie": "N/A",
            "naam": displayTitle,
            "specificatie_urls": {},
        });
    }
}


 function parseManualApisJson(json) {
     for(let table of Object.keys(tables)) {
         if(tables.hasOwnProperty(table)){
             tables[table] = json.tables[table] || [];
         }
     }
 }


 function parseDSOjson(json, table, api_name="Rest API") {
    for ( let name of Object.keys(json.datasets)) {
        let dataset = json.datasets[name];
        if(dataset.status == "beschikbaar" && dataset.environments.length){
            row = {
                "base_url": dataset.environments[0].specification_url,
                "short_name": dataset.short_name,
                "naam": dataset.service_name,
                "beschrijving":dataset.description,
                "api_urls": {},
                "documentatie_urls": {"ReadTheDocs": dataset.environments[0].documentation_url},
                "beschikbaarheid": dataset.terms_of_use.government_only?"Beperkt toegankelijk":"Openbaar",
                "licentie": "CC0"
            };
            if(dataset.terms_of_use.license == "Creative Commons, Naamsvermelding") {
                row["licentie"] = "CCBy4.0";
            }
            row.api_urls[api_name] = dataset.environments[0].api_url;
            table[table.length] = row;
        }
    } 
 }

 function makeTable(tableId, data){
    let table = document.getElementById(tableId);
    let statusRow = document.getElementById(tableId+"-status");

    // Legacy API's last
    sortedApis = data.sort((a,b) => a.hasOwnProperty("legacy"))
    
    sortedApis.forEach((api, i) => {
        let row = table.insertRow(-1);
        row.id = tableId + "-row-" + i;
        let base_url = api.base_url;
        
        if(api.legacy === true) {
            row.className = "legacy"
        }

        // Title column

        let cell1_Naam = row.insertCell(0);
        cell1_Naam.innerHTML = api.naam;

        if(base_url) {
          if (base_url.indexOf('mvt') === -1 && base_url.indexOf('wms') === -1 && base_url.indexOf('wfs') === -1) {
            cell1_Naam.innerHTML += "<div class='icon-status-none' id='" + api.short_name + "_status'></div>";
          }
        }

        if(api.beschrijving) {
            cell1_Naam.title = api.beschrijving;
            cell1_Naam.innerHTML += "<div class='info-icon' title='" + api.beschrijving + "'>?</div>";
        }
        if(api.beschikbaarheid !== "Openbaar") {
            cell1_Naam.innerHTML += "<div class='lock-icon' title='" + api.beschikbaarheid + "'>&#128274;</div>";
        }

        // Link column
        let cell2_link = row.insertCell(1);
        for ( let urlName of Object.keys(api.api_urls)) {
            cell2_link.innerHTML += '<a href="' + api.api_urls[urlName] + '">' + urlName + '</a> ';
        }

        // Documentation column
        let cell4_Docs = row.insertCell(2);
        for ( let urlName of Object.keys(api.documentatie_urls)) {
            cell4_Docs.innerHTML = '<a title="' + urlName + ' documentatie" href="' + api.documentatie_urls[urlName] + '">' + urlName + '</a>';
        }

        // Status column
        let cell5_Status = row.insertCell(3);
        cell5_Status.innerHTML = api.beschikbaarheid;

        if(api.legacy === true) {
            cell5_Status.innerHTML = "Legacy API <b>Niet gebruiken</b>, wordt <b>verwijderd</b>"
            
            if(api.replacedBy)  {
                cell5_Status.innerHTML += " Vervangende API: <a href='" + api.replacedBy + "'>" + api.replacedBy + '</a> ';
            }  
            cell5_Status.innerHTML += " </br><a href=#legacy-info>Meer informatie</a>"
        }

        // License Column
        let cell6_Licentie = row.insertCell(4);
        if(api.licentie == "CCBy4.0") {
            cell6_Licentie.innerHTML =
                '<a rel="license" href="https://creativecommons.org/licenses/by/4.0/">' +
                '<img alt="Creative Commons License" src="https://i.creativecommons.org/l/by/4.0/88x31.png"' + 
                ' width="88" height="31"/></a>';
        }
    });
    statusRow.remove();
 }

 window.onload = () => {
    let promises = [
        JSONRequest("manual_apis.json").catch(e => {console.log("Kan manual datasets niet ophalen.")}),
        JSONRequest(mapDomain + "/maps/index.json").catch(e => {
            console.log("Kan index van " + mapDomain + " niet ophalen.");
        }),
        JSONRequest(domain + dsoPath + "?_format=json").catch(e => {console.log("Kan datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "wfs/").catch(e => {console.log("Kan mvt datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "mvt/").catch(e => {console.log("Kan wfs datasets niet ophalen.")})
    ]
    clearSearch();
    Promise.all(promises).then((results) => {
        let resultHandlers = [
            parseManualApisJson, 
            parseMapIndex,
            (res) => parseDSOjson(res, tables.rest_apis),
            (res) => parseDSOjson(res, tables.geo_services, "WFS"),
            (res) => parseDSOjson(res, tables.tile_services, "MVT")
        ]
        resultHandlers.forEach((handler, i) => {
            if(results[i]) {
                handler(results[i]);
            }
        })
        for(let table of Object.keys(tables)) {
            if(tables.hasOwnProperty(table)){
                makeTable(table+"-table", tables[table]);
            }
        }
    })
 }


function search(inputId) {
    let query = document.getElementById(inputId).value.toLowerCase();
    let searchContainers = document.getElementsByClassName("search-container");
    if(!query.length) {
        return clearSearch();
    }
    for(let table of Object.keys(tables)) {
        tables[table].forEach((row, i) => {
            if(row.naam.toLowerCase().includes(query)) {
                document.getElementById(table + "-table-row-" + i).classList.remove("filter-hidden");
            } else {
                document.getElementById(table + "-table-row-" + i).classList.add("filter-hidden");
            }
        });
    }
    for (let i = 0; i < searchContainers.length; i++) {
        searchContainers[i].classList.add("active");
    } 
}


function clearSearch() {
    let filteredItems = document.getElementsByClassName("filter-hidden");
    while (filteredItems.length) {
        filteredItems[0].classList.remove("filter-hidden");
    }
    let searchContainers = document.getElementsByClassName("search-container");
    for (let i = 0; i < searchContainers.length; i++) {
        searchContainers[i].classList.remove("active");
        searchContainers[i].children.namedItem("query").value = "";
    } 
}

  window.addEventListener('load', async function() {
      //sleep 3 seconds 
      await new Promise(r => setTimeout(r, 3000));
      try {
          // 1. Get the initial API data
          let apiUrls = [];
          const response = await fetch(`${domain}${dsoPath}?_format=json`);
          const data = await response.json();
          
          for(const dataset in data.datasets) {
            apiUrls.push([data.datasets[dataset].short_name,data.datasets[dataset].environments[0].api_url]);
          }

          // 2. Loop over API URLs      
          for (const apiUrl of apiUrls) {
            try {
                  const apiResponse = await fetch(apiUrl[1]);
                  const apiData = await apiResponse.json();
                  const apiName = apiUrl[0];
                  const iconDiv = document.getElementById(`${apiName}_status`);
                  
                  let paths = Object.keys(apiData.paths);
                  paths = paths.filter(path => !path.includes('{'));
                  
                  const fullPaths = paths.map(path => `${domain}${path}?_pageSize=1`);

                  for (const path of fullPaths) {
                    try {
                        const pathResponse = await fetch(path);
                        const isValid = pathResponse.status === 200 || pathResponse.status === 403;
                        if (isValid) {
                          iconDiv.className = "icon-status-green";
                        } else {
                          iconDiv.className = "icon-status-red";
                          break;
                        }
                        
                    } catch (error) {
                        console.log(`${path}: false (Error: ${error.message})`);
                        iconDiv.className = "icon-status-red";
                    }
                  }
              } catch (error) {
                  console.error(`Error processing ${apiUrl}: ${error.message}`);
    
              }
          }
      } catch (error) {
          console.error(`Error fetching initial data: ${error.message}`);
      }
  });
