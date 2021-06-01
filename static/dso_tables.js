/**
 * Fill the api table from "https://api.data.amsterdam.nl/v1/"
 */

//  const domain = window.location.origin;
 const domain = "http://localhost:8000"
 const dsoPath = "/v1/";
 const tableId = "dso-api-table";
 const tableStatusId = "dso-table-status";
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
        dataset = json.datasets[name];
        if(dataset.status == "beschikbaar"){
            row = {
                "naam": dataset.service_name,
                "beschrijving":dataset.description,
                "api_urls": {},
                "documentatie_urls": {"ReadTheDocs": dataset.environments[0].documentation_url},
                "specificatie_urls": {"Specificatie": dataset.environments[0].specification_url},
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

    data.forEach((api, i) => {
        let row = table.insertRow(-1);
        row.id = tableId + "-row-" + i;

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

        // Specification column
        let cell3_Spec = row.insertCell(2);
        for ( let urlName of Object.keys(api.specificatie_urls)) {
            cell3_Spec.innerHTML += '<a title="' + urlName + ' specificatie" href="' + api.specificatie_urls[urlName] + '">' + urlName + '</a> ';
        }

        // Documentation column
        let cell4_Docs = row.insertCell(3);
        for ( let urlName of Object.keys(api.documentatie_urls)) {
            cell4_Docs.innerHTML = '<a title="' + urlName + ' documentatie" href="' + api.documentatie_urls[urlName] + '">' + urlName + '</a> ';
        }

        // Status column
        let cell5_Status = row.insertCell(4);
        cell5_Status.innerHTML = api.beschikbaarheid;

        // License Column
        let cell6_Licentie = row.insertCell(5);
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
        JSONRequest("/manual_apis.json").catch(e => {console.log("Kan manual datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "?_format=json").catch(e => {console.log("Kan datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "wfs/").catch(e => {console.log("Kan mvt datasets niet ophalen.")}),
        JSONRequest(domain + dsoPath + "mvt/").catch(e => {console.log("Kan wfs datasets niet ophalen.")})
    ]
    Promise.all(promises).then((results) => {
        if(results[0]) {
            parseManualApisJson(results[0]);
        }
        if(results[1]) {
            parseDSOjson(results[1], tables.rest_apis);
        }
        if(results[2]) {
            parseDSOjson(results[2], tables.geo_services, "WFS");
        }
        if(results[3]) {
            parseDSOjson(results[3], tables.tile_services, "MVT");
        }
        for(let table of Object.keys(tables)) {
            if(tables.hasOwnProperty(table)){
                makeTable(table+"-table", tables[table]);
            }
        }
    })
 }
