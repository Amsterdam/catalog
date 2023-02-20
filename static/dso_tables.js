/**
 * Fill the api table from "https://api.data.amsterdam.nl/v1/"
 */

 const domain = window.location.origin;
 const dsoPath = "/v1/";
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


 function parseManualApisJson(json) {
     for(let table of Object.keys(tables)) {
         if(tables.hasOwnProperty(table)){
             tables[table] = json.tables[table];
         }
     }
 }


 function parseDSOjson(json, table, api_name="Rest API") {
    for ( let name of Object.keys(json.datasets)) {
        let dataset = json.datasets[name];
        if(dataset.status == "beschikbaar" && dataset.environments.length){
            row = {
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

        if(api.legacy === true) {
            row.className = "legacy"
        }

        // Title column
        let cell1_Naam = row.insertCell(0);
        cell1_Naam.innerHTML = api.naam;
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
            cell4_Docs.innerHTML = '<a title="' + urlName + ' documentatie" href="' + api.documentatie_urls[urlName] + '">' + urlName + '</a> ';
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
        }  else {
            cell6_Licentie.innerHTML = 
                '<a rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">' +
                '<img src="https://i.creativecommons.org/p/zero/1.0/88x31.png" width="88" height="31" alt="Creative Commons License"/></a>';
        }      
    });
    statusRow.remove();
 }

 
 window.onload = () => {
    let promises = [
        JSONRequest("/api/manual_apis.json").catch(e => {console.log("Kan manual datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "?_format=json").catch(e => {console.log("Kan datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "wfs/").catch(e => {console.log("Kan mvt datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "mvt/").catch(e => {console.log("Kan wfs datasets niet ophalen.")})
    ]
    clearSearch();
    Promise.all(promises).then((results) => {
        let resultHandlers = [
            parseManualApisJson, 
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
