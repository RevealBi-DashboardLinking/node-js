var express = require('express');
var reveal = require('reveal-sdk-node');
var cors = require('cors');
//const fs = require("fs");

//const dashboardDefaultDirectory = "dashboards";

const app = express();
app.use(cors()); 

const dataSourceItemProvider = async (userContext, dataSourceItem) => {
 // await dataSourceProvider(userContext, dataSourceItem.dataSource);
  if (dataSourceItem instanceof reveal.RVLocalFileDataSourceItem) {
    dataSourceItem.uri = `local:/${dataSourceItem.id}.xlsx`;
  }
  return dataSourceItem;
};


const revealOptions = {
  dataSourceItemProvider: dataSourceItemProvider,
  localFileStoragePath: "data"
};

module.exports = reveal(revealOptions);