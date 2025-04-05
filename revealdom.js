const fs = require("fs");
const path = require("path");
const { RdashDocument } = require('@revealbi/dom');
const AdmZip = require("adm-zip");

module.exports = (app) => {
    const dashboardDirectory = "dashboards";

    // Route to serve the main page
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    /**
     * @swagger
     * /dashboards/:
     *   get:
     *     summary: Retrieve a list of dashboard filenames
     *     description: Retrieves a list of dashboard filenames from the server.
     *     responses:
     *       200:
     *         description: A list of dashboard filenames
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: string
     */
    app.get("/dashboards/", (req, res) => {
        fs.readdir(dashboardDirectory, (err, files) => {
            if (err) {
                console.log('Error getting directory information');
                res.status(500).send('Error getting directory information');
            } else {
                const filenames = files.map((file) => {
                    const extension = path.parse(file).ext;
                    return file.slice(0, -extension.length);
                });
                res.send(filenames);
            }
        });
    });

    /**
     * @swagger
     * /dashboards/names:
     *   get:
     *     summary: Retrieve dashboard names and titles
     *     description: Retrieves a list of dashboard filenames and their titles.
     *     responses:
     *       200:
     *         description: A list of dashboard filenames and titles
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   dashboardFileName:
     *                     type: string
     *                   dashboardTitle:
     *                     type: string
     */
    app.get("/dashboards/names", async (req, res) => {
        try {
            const fileNames = [];
            const dashboardFiles = fs.readdirSync(dashboardDirectory).filter(file => file.endsWith('.rdash'));

            for (const fileName of dashboardFiles) {
                const filePath = path.join(dashboardDirectory, fileName);
                const fileData = fs.readFileSync(filePath);
                const buffer = Buffer.from(fileData);
                const blob = new Blob([buffer], { type: 'application/zip' });
                const document = await RdashDocument.load(blob);    

                fileNames.push({
                    dashboardFileName: path.basename(fileName, path.extname(fileName)),
                    dashboardTitle: document.title
                });
            }
            res.status(200).json(fileNames);
        } catch (err) {
            console.error(`Error Reading Directory: ${err.message}`);
            res.status(500).send("An unexpected error occurred while processing the request.");
        }
    });

    /**
     * @swagger
     * /dashboards/{name}/exists:
     *   get:
     *     summary: Check if a dashboard exists
     *     description: Checks if a dashboard with the given name exists on the server.
     *     parameters:
     *       - in: path
     *         name: name
     *         required: true
     *         description: The name of the dashboard file (without extension).
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Returns true if the dashboard exists, false otherwise.
     *         content:
     *           application/json:
     *             schema:
     *               type: boolean
     */
    app.get("/dashboards/:name/exists", (req, resp) => {
        if (fs.existsSync(`${dashboardDirectory}/${req.params.name}.rdash`)) {
            resp.send(true);
        } else {
            resp.send(false);
        }
    });

    /**
     * @swagger
     * /dashboards/visualizations:
     *   get:
     *     summary: Retrieve visualizations from dashboards
     *     description: Retrieves a list of visualizations and related metadata from all dashboards.
     *     responses:
     *       200:
     *         description: A list of visualizations from dashboards
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   dashboardFileName:
     *                     type: string
     *                   dashboardTitle:
     *                     type: string
     *                   vizId:
     *                     type: string
     *                   vizTitle:
     *                     type: string
     *                   vizChartType:
     *                     type: string
     *                   vizImageUrl:
     *                     type: string
     */
    app.get("/dashboards/visualizations", async (req, resp) => {
        try {
            const allVisualizationChartInfos = [];
            const dashboardFiles = fs.readdirSync(dashboardDirectory).filter(file => file.endsWith('.rdash'));
    
            for (const fileName of dashboardFiles) {
                console.log(`Processing file: ${fileName}`);
                const filePath = path.join(dashboardDirectory, fileName);
                const fileData = fs.readFileSync(filePath);
                const blob = new Blob([fileData], { type: 'application/zip' });
                const document = await RdashDocument.load(blob);    
    
                if (document.title === "Customer Orders Analysis") {
                    console.log(`Skipping dashboard: ${document.title}`);
                    continue; 
                }
    
                document.visualizations.forEach(viz => {
                    console.log(`Processing visualization:`, viz);    
                    if (viz && viz.id) {
                        console.log(`Processing visualization: ${viz.id}`);
                    } else {
                        console.error(`Unexpected viz object format or viz.id is undefined:`, viz);
                    }
    
                    if (viz && viz.chartType) {
                        console.log(`Processing chart type: ${viz.chartType}`);
                    } else {
                        console.error(`viz.chartType is undefined or null for visualization: ${viz ? viz.id : 'undefined'}`);
                    }
    
                    const chartInfo = {
                        dashboardFileName: path.basename(filePath, '.rdash'),
                        dashboardTitle: document.title,
                        vizId: viz ? viz.id : 'undefined',
                        vizTitle: viz ? viz.title : 'undefined',
                        vizChartType: viz ? viz.chartType : 'undefined',
                        vizImageUrl: viz ? getImageUrl(viz.chartType) : 'undefined'
                    };
                    allVisualizationChartInfos.push(chartInfo);
                });
            }
            resp.status(200).json(allVisualizationChartInfos);
        } catch (ex) {
            console.error('An error occurred while processing visualizations:', ex);
            resp.status(500).send(`An error occurred: ${ex.message}`);
        }
    });
    
        /**
     * @swagger
     * /dashboards/{name}/thumbnail:
     *   get:
     *     summary: Get thumbnail info for a specific dashboard
     *     description: Extracts and returns metadata and visualization info from the specified RDASH file.
     *     parameters:
     *       - in: path
     *         name: name
     *         required: true
     *         description: The name of the dashboard file (without extension).
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Thumbnail info extracted from the dashboard
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                 displayName:
     *                   type: string
     *                 info:
     *                   type: object
     *                   properties:
     *                     Title:
     *                       type: string
     *                     ThemeName:
     *                       type: string
     *                     FormatVersion:
     *                       type: number
     *                     UseAutoLayout:
     *                       type: boolean
     *                     Widgets:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           _type:
     *                             type: string
     *                           RowSpan:
     *                             type: number
     *                           ColumnSpan:
     *                             type: number
     *                           IsTitleVisible:
     *                             type: boolean
     *                           Title:
     *                             type: string
     *                           VisualizationSettings:
     *                             type: object
     *                     DataSources:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           _type:
     *                             type: string
     *                           Provider:
     *                             type: string
     *                           Properties:
     *                             type: object
     *                           Settings:
     *                             type: object
     *                     GlobalFilters:
     *                       type: array
     *                       items:
     *                         type: object
     *                     GlobalVariables:
     *                       type: array
     *                       items:
     *                         type: object
     *                     IsTemplate:
     *                       type: boolean
     *       500:
     *         description: Server error or invalid file
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                 details:
     *                   type: string
     */
        app.get('/dashboards/:name/thumbnail', async (req, res) => {
            const { name } = req.params;
            const rdashPath = path.join(__dirname, dashboardDirectory, `${name}.rdash`);
    
            try {
                const thumbnailInfo = await extractThumbnailInfo(rdashPath);
                res.json(thumbnailInfo);
            } catch (error) {
                console.error('Error:', error.message);
                res.status(500).json({ error: 'Failed to process the dashboard', details: error.message });
            }
        });    
    
        // async function extractThumbnailInfo(rdashPath) {
        //     if (!fs.existsSync(rdashPath)) {
        //         throw new Error(`File not found: ${rdashPath}`);
        //     }
        
        //     const fileData = fs.readFileSync(rdashPath);
        //     const blob = new Blob([fileData], { type: 'application/zip' });
        //     const document = await RdashDocument.load(blob);
        
        //     const title = document.title || 'Unknown Dashboard';
        //     const widgets = document.visualizations || [];
        //     const dataSources = document.dataSources || [];
        
        //     return {
        //         id: document.tags || 'unknown',
        //         displayName: title,
        //         info: {
        //             Title: title,
        //             ThemeName: document.themeName || 'DefaultTheme',
        //             FormatVersion: document.formatVersion || 0,
        //             UseAutoLayout: document.useAutoLayout || false,
        //             Widgets: widgets.map(widget => ({
        //                 _type: widget.chartType || 'Unknown',
        //                 RowSpan: widget.rowSpan || 1,
        //                 ColumnSpan: widget.columnSpan || 1,
        //                 IsTitleVisible: false,
        //                 Title: widget.title || 'Untitled',
        //                 VisualizationSettings: widget.visualizationSettings || {}
        //             })),
        //             DataSources: dataSources.map(ds => ({
        //                 _type: ds._type || 'Unknown',
        //                 Provider: ds.provider || 'Unknown',
        //                 Properties: {},
        //                 Settings: {}
        //             })),
        //             GlobalFilters: document.globalFilters || [],
        //             GlobalVariables: document.globalVariables || [],
        //             IsTemplate: document.isTemplate || false
        //         }
        //     };
        // }
        

        async function extractThumbnailInfo(rdashPath) {
            if (!fs.existsSync(rdashPath)) {
                throw new Error(`File not found: ${rdashPath}`);
            }
    
            const zip = new AdmZip(rdashPath);
            const entries = zip.getEntries();
            console.log('Files in RDASH:', entries.map(entry => entry.entryName));
    
            const dashboardEntry = entries.find(entry => entry.entryName.toLowerCase().endsWith('dashboard.json'));
            if (!dashboardEntry) {
                throw new Error('dashboard.json not found in the .RDASH file');
            }
    
            let dashboardJSON;
            try {
                dashboardJSON = JSON.parse(dashboardEntry.getData().toString('utf8'));
            } catch (err) {
                throw new Error('Failed to parse dashboard.json: Invalid JSON format');
            }
    
            const title = dashboardJSON.Title || dashboardJSON.model?.Title || 'Unknown Dashboard';
            const widgets = dashboardJSON.Widgets || dashboardJSON.model?.Widgets || [];
            const dataSources = dashboardJSON.DataSources || dashboardJSON.model?.DataSources || [];
    
            return {
                id: dashboardJSON.Tags || dashboardJSON.model?.Tags || 'unknown',
                displayName: title,
                info: {
                    Title: title,
                    ThemeName: dashboardJSON.ThemeName || dashboardJSON.model?.ThemeName || 'DefaultTheme',
                    FormatVersion: dashboardJSON.FormatVersion || dashboardJSON.model?.FormatVersion || 0,
                    UseAutoLayout: dashboardJSON.UseAutoLayout || dashboardJSON.model?.UseAutoLayout || false,
                    Widgets: widgets.map(widget => ({
                        _type: widget.VisualizationSettings?._type || 'Unknown',
                        RowSpan: widget.RowSpan || 1,
                        ColumnSpan: widget.ColumnSpan || 1,
                        IsTitleVisible: false,
                        Title: widget.Title || 'Untitled',
                        VisualizationSettings: widget.VisualizationSettings || {}
                    })),
                    DataSources: dataSources.map(dataSource => ({
                        _type: dataSource._type,
                        Provider: dataSource.Provider || 'Unknown',
                        Properties: {},
                        Settings: {}
                    })),
                    GlobalFilters: [],
                    GlobalVariables: [],
                    IsTemplate: dashboardJSON.IsTemplate || dashboardJSON.model?.IsTemplate || false
                }
            };
        }

    function getImageUrl(input) {

        console.log(`Generating image URL for chart type: ${input}`);

        try {
            const visualizationSuffix = "Visualization";
            const dashboardImagePath = "/images/svg/";
    
            if (typeof input !== 'string') {
                console.error('Invalid input: Input should be a string.');
                return `${dashboardImagePath}default.svg`;  
            }
    
            input = input.trim();
            
            if (input.toLowerCase().endsWith(visualizationSuffix.toLowerCase())) {
                input = input.substring(0, input.length - visualizationSuffix.length).trim();
            }
    
            if (input === "") {
                console.error('Invalid input: Input is empty after processing.');
                return `${dashboardImagePath}default.svg`;  
            }
    
            return `${dashboardImagePath}${input}.svg`;
        } catch (error) {
            console.error('An error occurred while generating the image URL:', error);
            return "/images/svg/default.svg";  
        }
    }
    
};
