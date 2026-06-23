const AppServer = require("./core/AppServer");

const PORT = Number(process.env.PORT || 3000);

const app = new AppServer({ PORT });
app.start();
