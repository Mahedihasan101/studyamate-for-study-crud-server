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
        const user = await userCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
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

    // ✅ Send Partner Request (Fixed version)
    app.put("/partners/:id/request", async (req, res) => {
      try {
        const partnerId = req.params.id; // Partner ID
        const { currentUserMongoId } = req.body; // Current User ID

        if (!currentUserMongoId)
          return res.status(400).json({ message: "currentUserMongoId required" });

        if (partnerId === currentUserMongoId)
          return res.status(400).json({ message: "Can't connect to yourself" });

        const partnerObjectId = new ObjectId(partnerId);
        const currentUserObjectId = new ObjectId(currentUserMongoId);

        // 1️⃣ Add to current user's connections
        await userCollection.updateOne(
          { _id: currentUserObjectId },
          {
            $addToSet: {
              connections: { userId: partnerId, status: "connected" },
            },
          }
        );

        // 2️⃣ Add to partner's connections + increment both possible fields
        await userCollection.updateOne(
          { _id: partnerObjectId },
          {
            $addToSet: {
              connections: { userId: currentUserMongoId, status: "connected" },
            },
            $inc: { partnerCount: 1}, // ✅ spelling fix
          }
        );

        // 3️⃣ Return updated partner info
        const updatedPartner = await userCollection.findOne({
          _id: partnerObjectId,
        });

        res.json(updatedPartner);
      } catch (error) {
        console.error("Error sending request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // ✅ Get user connections
    app.get("/partners/:id/connections", async (req, res) => {
      try {
        const { id } = req.params;
        const user = await userCollection.findOne({ _id: new ObjectId(id) });

        if (!user) return res.status(404).json({ message: "User not found" });

        const connections = user.connections || [];
        if (connections.length === 0) return res.json([]);

        const ids = connections.map((c) => new ObjectId(c.userId));
        const connectedUsers = await userCollection
          .find({ _id: { $in: ids } })
          .toArray();

        res.json(connectedUsers);
      } catch (error) {
        console.error("Error fetching connections:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // ✅ Remove Connection
    app.put("/partners/:id/remove-connection", async (req, res) => {
      try {
        const { id } = req.params;
        const { partnerId } = req.body;

        await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $pull: { connections: { userId: partnerId } } }
        );

        await userCollection.updateOne(
          { _id: new ObjectId(partnerId) },
          { $pull: { connections: { userId: id } } }
        );

        res.json({ message: "Connection removed successfully" });
      } catch (error) {
        console.error("Error removing connection:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ Mongo connection error:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
