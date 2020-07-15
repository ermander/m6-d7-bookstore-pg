const express = require("express")
const db = require("../../db")

const router = express.Router()

router.post("/", async (req, res)=>{
    const response = await db.query("INSERT INTO shoppingcart (bookid, userid) VALUES ($1, $2) RETURNING id",
                                [ req.body.bookid, req.body.userid])

    res.send(response.rows[0])
})

router.get("/:userId", async (req, res) => {
    const response = await db.query(`SELECT asin, title, img, category, price as unitary_price, COUNT(*) As quantity, COUNT(*) * price as total
                                     FROM shoppingcart JOIN "Books" ON shoppingcart.bookid = "Books".asin
                                     WHERE userid = $1
                                     GROUP BY asin
                                     `, [ req.params.userId])

    res.send(response.rows)
})

router.delete("/:userId/:asin", async (req, res) =>{
    // SELECTING ONE of the shoppingcart items to be deleted
    //(SELECT id FROM shoppingcart 
    //    WHERE bookid = $1 AND userid = $2
    //    LIMIT 1)

    // DELETE where the record ID is the one in the result from the subquery
    // DELETE FROM shoppingcart where id IN 

    const response = await db.query(`DELETE FROM shoppingcart where id IN
                                     (SELECT id FROM shoppingcart 
                                      WHERE bookid = $1 AND userid = $2
                                      LIMIT 1)`,
                                      [ req.params.asin, req.params.userId])
    
    if (response.rowCount === 0)
        return res.status(404).send("Not found")
    
    res.send("DELETED")
})


module.exports = router;