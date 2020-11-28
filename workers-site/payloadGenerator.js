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

const getPayload = (actionName, inputValues) => {
  let payload;
  switch (actionName) {
    case "signup":
      payload = formatItem("UsersTable", inputValues);
      break;
    case "AddFriends":
      payload = {
        query: `LET otherUsers = (FOR users in UsersTable FILTER users._key != @username RETURN users)
        FOR user in otherUsers
            INSERT { _from: CONCAT("UsersTable/",@username), _to: CONCAT("UsersTable/",user._key)  } INTO friend`,
        bindVars: inputValues,
      };
      break;
    case "signin":
      payload = {
        TableName: "UsersTable",
        Key: { "customer": { "S": inputValues.customer } },
      }
      break;

    case "ListBooks":
      payload = {
        TableName: "BooksTable",
        FilterExpression: "#category = :category",
        ExpressionAttributeNames: { "#category": "category" },
        ExpressionAttributeValues: { ":category": { "S": inputValues } },
      }

      break;
    case "GetBook":
      payload = {
        query: "FOR book in BooksTable FILTER book._key == @bookId RETURN book",
        bindVars: { bookId: inputValues },
      };
      break;

    case "GetCustomerCartItems":
      payload = {
        TableName: "CartTable",
        FilterExpression: "#customerId = :customerId",
        ExpressionAttributeNames: { "#customerId": "customerId" },
        ExpressionAttributeValues: { ":customerId": { "S": inputValues } },
      }
      break;

    case "GetBookItems":
      payload = {
        TableName: "BooksTable",
        Key: { "bookId": { "S": inputValues } },
      }
      break;

    case "FindCartItem":
      payload = {
        TableName: "CartTable",
        Key: { "cartId": { "S": inputValues.cartId } },
      }
      break;
    case "AddToCart":
      payload = formatItem("CartTable", inputValues);
      break;
    case "UpdateCart":
      payload = formatItem("CartTable", inputValues);
      break;
    case "RemoveFromCart":
      payload = {
        TableName: "CartTable",
        Key: { "cartId": { "S": inputValues.cartId } }
      }
      break;
    case "GetCartItem":
      payload = {
        query:
          "FOR item IN CartTable FILTER item.customerId == @customerId AND item.bookId == @bookId RETURN item",
        bindVars: inputValues,
      };
      break;

    case "ListOrders":
      payload = {
        TableName: "OrdersTable",
        FilterExpression: "#customerId = :customerId",
        ExpressionAttributeNames: { "#customerId": "customerId" },
        ExpressionAttributeValues: { ":customerId": { "S": inputValues } },
      }
      break;
    case "Checkout":
      payload = {
        query: `LET items = (FOR item IN CartTable FILTER item.customerId == @customerId RETURN item)
        LET books = (FOR item in items
            FOR book in BooksTable FILTER book._key == item.bookId return {bookId:book._key ,author: book.author,category:book.category,name:book.name,price:book.price,rating:book.rating,quantity:item.quantity})
        INSERT {_key: @orderId, orderId: @orderId, customerId: @customerId, books: books, orderDate: @orderDate} INTO OrdersTable
        FOR item IN items REMOVE item IN CartTable`,
        bindVars: inputValues,
      };
      break;
    case "AddPurchased":
      payload = {
        query: `LET order = first(FOR order in OrdersTable FILTER order._key == @orderId RETURN {customerId: order.customerId, books: order.books})
        LET customerId = order.customerId
        LET userId = first(FOR user IN UsersTable FILTER user.customerId == customerId RETURN user._id)
        LET books = order.books
        FOR book IN books
            INSERT {_from: userId, _to: CONCAT("BooksTable/",book.bookId)} INTO purchased`,
        bindVars: inputValues,
      };
      break;

    case "GetBestSellers":
      payload = {
        // query:
        //   "FOR book in BestsellersTable SORT book.quantity DESC LIMIT 20 return book._key",
        query: `FOR bestseller in BestsellersTable
        FOR book in BooksTable
            FILTER bestseller._key == book._key SORT bestseller.quantity DESC LIMIT 20 RETURN book`,
        bindVars: {},
      };
      break;

    case "GetRecommendations":
      payload = {
        query: `LET userId = first(FOR user in UsersTable FILTER user.customerId == @customerId return user._id)
        FOR user IN ANY userId friend
            FOR books IN OUTBOUND user purchased
            RETURN books`,
        bindVars: inputValues,
      };
      break;
    case "GetRecommendationsByBook":
      payload = {
        query: `LET userId = first(FOR user in UsersTable FILTER user.customerId == @customerId return user._id)
      LET bookId = CONCAT("BooksTable/",@bookId)
      FOR friendsPurchased IN INBOUND bookId purchased
          FOR user IN ANY userId friend
              FILTER user._key == friendsPurchased._key
                  RETURN user`,
        bindVars: inputValues,
      };
      break;

    case "Search":
      payload = {
        query: `FOR doc IN findBooks
      SEARCH PHRASE(doc.name, @search, "text_en") OR PHRASE(doc.author, @search, "text_en") OR PHRASE(doc.category, @search, "text_en")
      SORT BM25(doc) desc
      RETURN doc`,
        bindVars: inputValues,
      };
      break;
  }
  return payload;
};

module.exports = { getPayload };
