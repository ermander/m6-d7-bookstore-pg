const express = require("express")
const db = require("../../db")
const books = require("../../../books.json")

const router = express.Router()

router.post("/import", async (req, res) => {
    //retrieve previous ASINs
    const response = await db.query('SELECT asin  FROM "Books"')

    //mapping them out as a list of strings
    const asinList = response.rows.map(x => x.asin)

    let total = 0
    let skipped = 0

    books.forEach(async book => { //for each book in the books.json
        if (asinList.indexOf(book.asin) === -1){ //if the books is NOT in the list
            //ADD IT to the Database
            await db.query(`INSERT INTO "Books" (ASIN, Category, Img, Title, Price) 
                                                Values ($1, $2, $3, $4, $5)`, 
                                                [ book.asin, book.category, book.img, book.title, book.price])
            total++ //increment total
        } //if it's in the list
        else { //skip it!
            console.log(`Element ${book.asin} is already in the DB!`)
            skipped++ //increment skipped
        }
    })

    res.send({ //return the number of skipped and added
        added: total,
        skipped
    })
})

router.get("/", async(req, res)=>{
    // getting values from Query String ?offset=10 etc
    // OR setting a default value
    const order = req.query.order || "asc"
    const offset = req.query.offset || 0
    const limit = req.query.limit || 10

    // removing them from Query since otherwise I'll automatically filter on them
    delete req.query.order
    delete req.query.offset
    delete req.query.limit

    let query = 'SELECT * FROM "Books" ' //create my query

    const params = []
    for (queryParam in req.query) { //for each value in query string, I'll filter
        params.push(req.query[queryParam])

        if (params.length === 1) // for the first, I'll add the where clause
            query += `WHERE ${queryParam} = $${params.length} `
        else // the all the rest, it'll start with AND
            query += ` AND ${queryParam} = $${params.length} `
    }

    query += " ORDER BY Title " + order  //adding the sorting 

    params.push (limit)
    query += ` LIMIT $${params.length} `
    params.push(offset)
    query += ` OFFSET $${params.length}`
    // query += ` LIMIT $${params.length+1} OFFSET $${params.length+2}` //adding the pagination
    // params.push(limit)
    // params.push(offset) 
    console.log(query)

    //you can also specify just the fields you are interested in, like:
    //SELECT asin, category, img, title, price FROM "Books" 
    const response = await db.query(query, params)
    res.send(response.rows)
})

router.get("/:asin", async (req, res)=>{
    const response = await db.query('SELECT asin, category, img, title, price FROM "Books" WHERE ASIN = $1', 
                                                                                        [ req.params.asin ])

    if (response.rowCount === 0) 
        return res.status(404).send("Not found")

    res.send(response.rows[0])
})

router.post("/", async (req, res)=> {
    const response = await db.query(`INSERT INTO "Books" (ASIN, Category, Img, Title, Price) 
                                     Values ($1, $2, $3, $4, $5)
                                     RETURNING *`, 
                                    [ req.body.asin, req.body.category, req.body.img, req.body.title, req.body.price ])
    
    console.log(response)
    res.send(response.rows[0])
})

router.put("/:asin", async (req, res)=> {
    try {
        let params = []
        let query = 'UPDATE "Books" SET '
        for (bodyParamName in req.body) {
            query += // for each element in the body I'll add something like parameterName = $Position
                (params.length > 0 ? ", " : '') + //I'll add a coma before the parameterName for every parameter but the first
                bodyParamName + " = $" + (params.length + 1) // += Category = $1 

            params.push(req.body[bodyParamName]) //save the current body parameter into the params array
        }

        params.push(req.params.asin) //push the asin into the array
        query += " WHERE asin = $" + (params.length) + " RETURNING *" //adding filtering for ASIN + returning
        console.log(query)

        const result = await db.query(query, params) //querying the DB for updating the row

        // const result = await db.query(`UPDATE "Books" 
        //                             SET Category = $1,
        //                             Img = $2,
        //                             Title = $3,
        //                             Price = $4
        //                             WHERE ASIN = $5
        //                             RETURNING *`,
        //                             [ req.body.category, req.body.img, req.body.title, req.body.price, req.params.asin])
        
        if (result.rowCount === 0) //if no element match the specified ASIN => 404
            return res.status(404).send("Not Found")

        res.send(result.rows[0]) //else, return the updated version
    }
    catch(ex) {
        console.log(ex)
        res.status(500).send(ex)
    }
})

router.delete("/:asin", async (req, res) => {
    const response = await db.query(`DELETE FROM "Books" WHERE ASIN = $1`, [ req.params.asin ])

    if (response.rowCount === 0)
        return res.status(404).send("Not Found")
    
    res.send("OK")
})

module.exports = router