const express = require("express");
const app = express();

app.use("/api", require("./routes/api"));

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
