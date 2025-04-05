var express = require('express');
var reveal = require('reveal-sdk-node');
var cors = require('cors');
const fs = require("fs");

const dashboardDefaultDirectory = "dashboards";

const app = express();
app.use(cors()); 

// // Step 2: Data source provider
// const dataSourceProvider = async (userContext, dataSource) => {
//   return dataSource;
// };

// // Step 3: Authentication provider
// const authenticationProvider = async (userContext, dataSource) => {  
//   if (dataSource instanceof reveal.RVPostgresDataSource || dataSource instanceof reveal.RVSnowflakeDataSource) {
//     return new reveal.RVUsernamePasswordDataSourceCredential("", ""); 
//   }
// }


const dataSourceItemProvider = async (userContext, dataSourceItem) => {
  await dataSourceProvider(userContext, dataSourceItem.dataSource);

  if (dataSourceItem instanceof reveal.RVLocalFileDataSourceItem) {
      dataSourceItem.uri = "local:/NorthwindTradersCorpSales.xlsx";
  }
  return dataSourceItem;
}

// // Step 5: Dashboard provider
// const dashboardProvider = async (userContext, dashboardId) => {
//   console.log(`Loading dashboard ${dashboardId}`);
//   return fs.createReadStream(`${dashboardDefaultDirectory}/${dashboardId}.rdash`);
// }


// Reveal options
const revealOptions = {
  // userContextProvider: userContextProvider,
  // authenticationProvider: authenticationProvider,
  //dataSourceProvider: dataSourceProvider,
  dataSourceItemProvider: dataSourceItemProvider,
  // dashboardProvider: dashboardProvider,
  localFileStoragePath: "data"
};

module.exports = reveal(revealOptions);