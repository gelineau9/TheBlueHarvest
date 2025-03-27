// /apps/backend/src/index.ts

import express, { Request, Response } from "express";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the BHA Backend!" });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
