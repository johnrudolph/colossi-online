import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Test API endpoint hit:", req.method, req.body);

  if (req.method === "POST") {
    res.status(200).json({
      success: true,
      message: "Test API working!",
      receivedData: req.body,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(200).json({
      success: true,
      message: "Test API working with GET!",
      timestamp: new Date().toISOString(),
    });
  }
}
