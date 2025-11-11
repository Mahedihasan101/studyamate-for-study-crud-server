const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})




const uri = "mongodb+srv://user-db:5EDDLpWyZGLTOG0a@cluster0.s207qed.mongodb.net/?appName=Cluster0";


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('userDB')
        const userCollection = db.collection('users')

        app.get('/users', async (req,res)=>{
            const result = await userCollection.find().toArray();
           
            res.send(result)
        });

        app.get('/users/:id',async (req,res)=>{
            const {id}= req.params
            const result = await userCollection.findOne({_id:new ObjectId(id)})
            res.send(result)
        })


        app.post('/users',async (req,res)=>{
            const data = req.body
           const result = await userCollection.insertOne(data)

            res.send({
                result
            })
        })







    
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
         } finally {
    
        // await client.close();
         }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
})
