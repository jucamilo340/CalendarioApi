import app from "./app";

const PORT = process.env.PORT;
console.log(`PORT: ${process.env.PORT}`);


app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}!`));
