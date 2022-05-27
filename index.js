const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.yxr34.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect()
        console.log('connected')
        const productCollection = client.db('parts_manufacturer').collection('toolsCollection');
        const userCollection = client.db('parts_manufacturer').collection('userCollection');
        const reviewsCollection = client.db('parts_manufacturer').collection('reviewsCollection');
        const orders = client.db('parts_manufacturer').collection('ordersCollection');
        const profile = client.db('parts_manufacturer').collection('profilesCollection');
        const admins = client.db('parts_manufacturer').collection('adminCollection');


      

    const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
            next();
        }
        else {
            res.status(403).send({ message: 'forbidden' });
        }
    }

    app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' })
        res.send({ result, token });
      });
    //make admin
    app.put('/api/admin',  async (req, res) => {
        const email = req.body.email;
        const role = 'admin';
        const filter = { email: email };
        const user = { email, role };
        const options = { upsert: true };
        const updateDoc = {
            $set: user,
        };
        const result = await admins.updateOne(filter, updateDoc, options);
        res.send(result);
    })

    //API to get tools homepage
    app.get("/tools", async (req, res) => {
        const tools = await productCollection.find().sort({_id:-1}).limit(6).toArray();
        res.send(tools);
    });

    //API to get all tools
    app.get("/toolsall", async (req, res) => {
        const tools = await productCollection.find().toArray();
        res.send(tools);
    });
    //API to get all to manage
    app.get("/toolsallmanage", async (req, res) => {
        const tools = await productCollection.find().toArray();
        res.send(tools);
    });

    app.get('/tools/:id', async (req, res) => {
        const id = req.params.id;
        const product = await productCollection.findOne({ _id: ObjectId(id) });
        res.send(product);
    }) 


    app.post('/api/order', async (req, res) => {
        const order = req.body;
        const product = await productCollection.findOne({ _id: ObjectId(order?.product) })
        if (product) {
            let qtn = parseInt(product?.quantity) - parseInt(order?.quantity);
            const pay = parseFloat(product?.price) * parseInt(order?.quantity);
            if (pay < 999999) {
                order.pay = pay;
                await productCollection.updateOne({ _id: ObjectId(order?.product) }, { $set: { quantity: qtn } });

                const result = await orders.insertOne(order);
                return res.send(result);
            }
            else {
                return res.send({ message: `you can't order more than $999,999.99` });
            }

        }
        res.send({ message: 'Product not found' });

    })

    app.get('/api/order', async (req, res) => {
        const email = req.query.email;
        const result = await orders.find({ user: email }).toArray();
        res.send(result);
    })

    app.get('/api/users/profile/:email',async (req, res) => {
        const email = req.params.email;
        const result = await profile.findOne({ email });
        if (result) {
            res.send(result);
        }
        else {
            res.send('User not found');
        }
    })

    //  add a review

     app.post('/api/review', async (req, res) => {
         const review = req.body;
         const result = await reviewsCollection.insertOne(review);
         res.send(result);
     })

    
    // get reviews for homepage

     app.get('/api/home/review', async (req, res) => {
        const reviews = await reviewsCollection.find({}).sort({ _id: -1 }).limit(3).toArray();
        res.send(reviews);
    }) 

    //  user profile update
   
    app.put('/api/users/profile',async (req, res) => {
       const data = req.body;
       const filter = { email: data.email };
       const options = { upsert: true };
       const updateDoc = {
           $set: data,
       }
       const result = await profile.updateOne(filter, updateDoc, options);
       res.send(result);
   })

//cancle order

app.delete('/api/user/orders/:id', async (req, res) => {
    const id = req.params.id;
    const result = await orders.deleteOne({ _id: ObjectId(id) });
    res.send(result);
})

//delete product

app.delete('/api/products/:id', async (req, res) => {
    const product = req.params.id;
    const result = await productCollection.deleteOne({ _id: ObjectId(product) });
    res.send(result);
})

//1
app.get('/api/orders', async (req, res) => {
    const result = await orders.find({}).toArray();
    res.send(result);
})

app.get('/api/users', async (req, res) => {
    const adminCollection = await admins.find().toArray()
    const users = await userCollection.find().toArray();
    users.forEach(user => {
        const admin = adminCollection.find(admin => admin.email === user.email);
        if (admin) {
            user.isAdmin = true;
        } else {
            user.isAdmin = false;
        }
    })
    res.send(users);

})

//get user profile
       

app.get('/api/users/profile/:email', async (req, res) => {
    const email = req.params.email;
    const result = await profile.findOne({ email });
    if (result) {
        res.send(result);
    }
    else {
        res.send('User not found');
    }


})
// admin-user
app.get('/api/users', async (req, res) => {
    const adminCollection = await admins.find().toArray()
    const users = await userCollection.find().toArray();
    users.forEach(user => {
        const admin = adminCollection.find(admin => admin.email === user.email);
        if (admin) {
            user.isAdmin = true;
        } else {
            user.isAdmin = false;
        }
    })
    res.send(users);

})

app.delete('/api/admin/users/:id',async (req, res) => {
    const id = req.params.id;
    console.log(id)
    const filter = { _id: ObjectId(id) };
    const result = await userCollection.deleteOne(filter);
    res.send(result);
})

//order delete
app.delete('/api/orders/:id', async (req, res) => {
    const id = req.params.id;
    const result = await orders.deleteOne({ _id: ObjectId(id) });
    res.send(result);
})
//
app.delete('/api/products/admin/:id', async (req, res) => {
    const product = req.params.id;
    const result = await productCollection.deleteOne({ _id: ObjectId(product) });
    res.send(result);
})

app.delete('/api/admin/orders/:id',  async (req, res) => {
    const id = req.params.id;
    const result = await orders.deleteOne({ _id: ObjectId(id) });
    res.send(result);
})

app.post('/api/admin/products', async (req, res) => {
    const product = req.body;
    const result = await productCollection.insertOne(product);
    res.send(result);
})

app.post('/api/products', async (req, res) => {
    const product = req.body;
    const result = await productCollection.insertOne(product);
    res.send(result);
})

//order payment
app.get('/api/order/:id',async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) }
    const result = await orders.findOne(query);
    res.send(result);
})




    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('GPU manufacturer running!')
})

app.listen(PORT, () => {
    console.log('GPU manufacturer app listening', PORT)
})

