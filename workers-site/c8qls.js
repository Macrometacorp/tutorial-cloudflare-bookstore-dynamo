const formatItem = (name, item) => {
  const formatItemData = (item) => {
    let itemObject = {};
    for (const key in item) {
      const valueType = typeof item[key];
      let type = "S";
      if (valueType === "boolean") {
        type = "BOOL";
      } else if (valueType === "number") {
        type = "N";
      } else if (valueType === "object") {
        if (Array.isArray(item[key])) {
          itemObject[key] = { "L": [] };
          for (const subItem of item[key]) {
            itemObject[key]["L"].push({ "M": { ...formatItemData(subItem) } });
          }
        } else {
          itemObject[key] = { "M": {} };
          itemObject[key]["M"] = { ...formatItemData(item[key]) };
        }
      }
      if (valueType !== "object") {
        itemObject[key] = { [type]: item[key] };
      }
    }
    return itemObject
  }

  const formattedItemObject = formatItemData(item);

  return {
    TableName: name,
    Item: formattedItemObject
  }
}

const queries = (queryName, bindValue) => {
  let queryObj;
  switch (queryName) {
    case "signup":
      queryObj = formatItem("UsersTable", bindValue);
      break;
    case "AddFriends":
      queryObj = {
        query: `LET otherUsers = (FOR users in UsersTable FILTER users._key != @username RETURN users)
        FOR user in otherUsers
            INSERT { _from: CONCAT("UsersTable/",@username), _to: CONCAT("UsersTable/",user._key)  } INTO friend`,
        bindVars: bindValue,
      };
      break;
    case "signin":
      queryObj = {
        TableName: "UsersTable",
        FilterExpression: "#customer = :customer AND #password = :password",
        ExpressionAttributeNames: { "#customer": "customer", "#password": "password" },
        ExpressionAttributeValues: { ":customer": { "S": bindValue.customer }, ":password": { "S": bindValue.password } },
        ConsistentRead: true
      }
      break;

    case "ListBooks":
      queryObj = {
        TableName: "BooksTable",
        FilterExpression: "#category = :category",
        ExpressionAttributeNames: { "#category": "category" },
        ExpressionAttributeValues: { ":category": { "S": bindValue } },
        ConsistentRead: true
      }

      break;
    case "GetBook":
      queryObj = {
        query: "FOR book in BooksTable FILTER book._key == @bookId RETURN book",
        bindVars: { bookId: bindValue },
      };
      break;

    case "GetCustomerCartItems":
      queryObj = {
        TableName: "CartTable",
        FilterExpression: "#customerId = :customerId",
        ExpressionAttributeNames: { "#customerId": "customerId" },
        ExpressionAttributeValues: { ":customerId": { "S": bindValue } },
        ConsistentRead: true
      }
      break;

    case "GetBookItems":
      queryObj = {
        TableName: "BooksTable",
        FilterExpression: "#bookId = :bookId",
        ExpressionAttributeNames: { "#bookId": "bookId" },
        ExpressionAttributeValues: { ":bookId": { "S": bindValue } },
        ConsistentRead: true
      }
      break;

    case "FindCartItem":
      queryObj = {
        TableName: "CartTable",
        FilterExpression: "#cartId = :cartId",
        ExpressionAttributeNames: { "#cartId": "cartId" },
        ExpressionAttributeValues: { ":cartId": { "S": bindValue.cartId } },
        ConsistentRead: true
      }
      break;
    case "AddToCart":
      queryObj = formatItem("CartTable", bindValue);
      break;
    case "UpdateCart":
      queryObj = formatItem("CartTable", bindValue);
      break;
    case "RemoveFromCart":
      queryObj = {
        TableName: "CartTable",
        Key: { "cartId": { "S": bindValue.cartId } }
      }
      break;
    case "GetCartItem":
      queryObj = {
        query:
          "FOR item IN CartTable FILTER item.customerId == @customerId AND item.bookId == @bookId RETURN item",
        bindVars: bindValue,
      };
      break;

    case "ListOrders":
      queryObj = {
        TableName: "OrdersTable",
        FilterExpression: "#customerId = :customerId",
        ExpressionAttributeNames: { "#customerId": "customerId" },
        ExpressionAttributeValues: { ":customerId": { "S": bindValue } },
        ConsistentRead: true
      }
      break;
    case "Checkout":
      queryObj = {
        query: `LET items = (FOR item IN CartTable FILTER item.customerId == @customerId RETURN item)
        LET books = (FOR item in items
            FOR book in BooksTable FILTER book._key == item.bookId return {bookId:book._key ,author: book.author,category:book.category,name:book.name,price:book.price,rating:book.rating,quantity:item.quantity})
        INSERT {_key: @orderId, orderId: @orderId, customerId: @customerId, books: books, orderDate: @orderDate} INTO OrdersTable
        FOR item IN items REMOVE item IN CartTable`,
        bindVars: bindValue,
      };
      break;
    case "AddPurchased":
      queryObj = {
        query: `LET order = first(FOR order in OrdersTable FILTER order._key == @orderId RETURN {customerId: order.customerId, books: order.books})
        LET customerId = order.customerId
        LET userId = first(FOR user IN UsersTable FILTER user.customerId == customerId RETURN user._id)
        LET books = order.books
        FOR book IN books
            INSERT {_from: userId, _to: CONCAT("BooksTable/",book.bookId)} INTO purchased`,
        bindVars: bindValue,
      };
      break;

    case "GetBestSellers":
      queryObj = {
        // query:
        //   "FOR book in BestsellersTable SORT book.quantity DESC LIMIT 20 return book._key",
        query: `FOR bestseller in BestsellersTable
        FOR book in BooksTable
            FILTER bestseller._key == book._key SORT bestseller.quantity DESC LIMIT 20 RETURN book`,
        bindVars: {},
      };
      break;

    case "GetRecommendations":
      queryObj = {
        query: `LET userId = first(FOR user in UsersTable FILTER user.customerId == @customerId return user._id)
        FOR user IN ANY userId friend
            FOR books IN OUTBOUND user purchased
            RETURN books`,
        bindVars: bindValue,
      };
      break;
    case "GetRecommendationsByBook":
      queryObj = {
        query: `LET userId = first(FOR user in UsersTable FILTER user.customerId == @customerId return user._id)
      LET bookId = CONCAT("BooksTable/",@bookId)
      FOR friendsPurchased IN INBOUND bookId purchased
          FOR user IN ANY userId friend
              FILTER user._key == friendsPurchased._key
                  RETURN user`,
        bindVars: bindValue,
      };
      break;

    case "Search":
      queryObj = {
        query: `FOR doc IN findBooks
      SEARCH PHRASE(doc.name, @search, "text_en") OR PHRASE(doc.author, @search, "text_en") OR PHRASE(doc.category, @search, "text_en")
      SORT BM25(doc) desc
      RETURN doc`,
        bindVars: bindValue,
      };
      break;
  }
  return queryObj;
};

module.exports = { queries };
