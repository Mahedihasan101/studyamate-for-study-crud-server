const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://user-db:5EDDLpWyZGLTOG0a@cluster0.s207qed.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("partnerDB");
    const userCollection = db.collection("partners");

    // ✅ Get all users
    app.get("/partners", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.json(users);
    });

    // ✅ Get single user
    app.get("/partners/:id", async (req, res) => {
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
      } catch {
        res.status(400).json({ message: "Invalid user ID" });
      }
    });

    // ✅ Create new user
    app.post("/partners", async (req, res) => {
      const data = req.body;
      data.partnerCount = 0;
      data.connections = [];
      const result = await userCollection.insertOne(data);
      res.json(result);
    });

    // ✅ Send Partner Request
    app.put("/partners/:id/request", async (req, res) => {
      try {
        const partnerId = req.params.id;
        const { currentUserMongoId } = req.body;

        if (!currentUserMongoId) return res.status(400).json({ message: "currentUserMongoId required" });
        if (partnerId === currentUserMongoId) return res.status(400).json({ message: "Can't connect to yourself" });

        const partnerObjectId = new ObjectId(partnerId);
        const currentUserObjectId = new ObjectId(currentUserMongoId);

        // Add to current user's connections
        await userCollection.updateOne(
          { _id: currentUserObjectId },
          { $addToSet: { connections: { userId: partnerId, status: "connected" } } }
        );

        // Add to partner's connections + increment partnerCount
        await userCollection.updateOne(
          { _id: partnerObjectId },
          { 
            $addToSet: { connections: { userId: currentUserMongoId, status: "connected" } },
            $inc: { partnerCount: 1 }
          }
        );

        const updatedPartner = await userCollection.findOne({ _id: partnerObjectId });
        res.json(updatedPartner);
      } catch (error) {
        console.error("Error sending request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ✅ Cancel Partner Request
    app.put("/partners/:id/cancel-request", async (req, res) => {
      try {
        const partnerId = req.params.id;
        const { currentUserMongoId } = req.body;

        if (!currentUserMongoId) return res.status(400).json({ message: "currentUserMongoId required" });

        const partnerObjectId = new ObjectId(partnerId);
        const currentUserObjectId = new ObjectId(currentUserMongoId);

        // Remove connection from current user
        await userCollection.updateOne(
          { _id: currentUserObjectId },
          { $pull: { connections: { userId: partnerId } } }
        );

        // Remove connection from partner + decrement partnerCount safely
        await userCollection.updateOne(
          { _id: partnerObjectId },
          { $pull: { connections: { userId: currentUserMongoId } }, $inc: { partnerCount: -1 } }
        );

        const updatedPartner = await userCollection.findOne({ _id: partnerObjectId });
        res.json(updatedPartner);
      } catch (error) {
        console.error("Error cancelling request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
// Update Partner Profile
app.put("/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const updateData = req.body;

    const result = await userCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result.value) return res.status(404).json({ message: "User not found" });

    res.json(result.value);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile" });
  }
});



    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ Mongo connection error:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
