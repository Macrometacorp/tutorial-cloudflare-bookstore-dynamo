import {
  getAssetFromKV,
  mapRequestToAsset,
} from "@cloudflare/kv-asset-handler";
const Router = require("./router");
const init = require("./init");
const jsc8 = require("jsc8");
const { DynamoDB } = require("mmdynamo");
const { getPayload } = require("./payloadGenerator");
const { uuid } = require("@cfworker/uuid");
const { decode } = require("base64-arraybuffer");
/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */

const DEBUG = false;

addEventListener("fetch", (event) => {
  try {
    event.respondWith(handleEvent(event));
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        })
      );
    }
    event.respondWith(new Response("Internal Error", { status: 500 }));
  }
});

async function handleAssetEvent(event) {
  const url = new URL(event.request.url);
  let options = {};

  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`
   */
  // options.mapRequestToAsset = handlePrefix(/^\/docs/)

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true,
      };
    }
    return await getAssetFromKV(event, options);
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: (req) =>
            new Request(`${new URL(req.url).origin}/404.html`, req),
        });

        return new Response(notFoundResponse.body, {
          ...notFoundResponse,
          status: 404,
        });
      } catch (e) { }
    }

    return new Response(e.message || e.toString(), { status: 500 });
  }
}

/**
 * Here's one example of how to modify a request to
 * remove a specific prefix, in this case `/docs` from
 * the url. This can be useful if you are deploying to a
 * route on a zone, or if you only want your static content
 * to exist at a specific path.
 */
function handlePrefix(prefix) {
  return (request) => {
    // compute the default (e.g. / -> index.html)
    let defaultAssetKey = mapRequestToAsset(request);
    let url = new URL(defaultAssetKey.url);

    // strip the prefix from the path for lookup
    url.pathname = url.pathname.replace(prefix, "/");

    // inherit all other props from the default request
    return new Request(url.toString(), defaultAssetKey);
  };
}

////////////////////

const CUSTOMER_ID_HEADER = "x-customer-id";

const optionsObj = {
  headers: {
    "content-type": "application/json",
  },
};

const client = new jsc8({
  url: C8_URL,
  apiKey: C8_API_KEY,
  agentOptions: {
    maxSockets: 50000
  },
  agent: fetch,
});

const dcName = C8_URL.split("https://")[1];
const host = "https://api-" + dcName;
const endpoint = host + "/_api/dynamo";
// secretAccessKey is a required parameter for aws-sdk we recommend you to pass "c8"
const secretAccessKey = "c8";
const accessKeyId = "apikey " + C8_API_KEY;

const dynamoClient = new DynamoDB({
  endpoint,
  accessKeyId,
  secretAccessKey,
});

const getLastPathParam = (request) => {
  const splitUrl = request.url.split("/");
  return splitUrl[splitUrl.length - 1];
};

const executeQuery = async (c8qlKey, bindValue) => {
  const { query, bindVars } = getPayload(c8qlKey, bindValue);
  let result;
  try {
    result = await client.executeQuery(query, bindVars);
  } catch (err) {
    result = err;
  }
  return result;
};

const getCustomerId = (request) => request.headers.get(CUSTOMER_ID_HEADER);

const convertOutput = (data) => {
  const createObj = (item) => {
    let output = {};
    for (var key in item) {
      const subItem = item[key];
      const createSubObj = (key, subItem) => {
        let obj = {};
        for (var type in subItem) {
          if (type === 'SS') {
            obj[key] = [];
            for (let i = 0; i < subItem[type].length; i++) {
              obj[key].push(subItem[type][i]);
            }
          } else if (type === 'M') {
              obj = createObj(subItem[type]);
          } else if (type === 'L') {
            obj[key] = [];
            for (var i = 0; i < subItem[type].length; i++) {
              obj[key].push(createSubObj(key, subItem[type][i]));
            }
          } else if (type === 'S') {
            obj[key] = subItem[type];
          } else if (type === 'N') {
            obj[key] = Number(subItem[type]);
          } else if (type === 'BOOL') {
            obj[key] = (subItem[type] === 'true' || subItem[type] === 'TRUE' || subItem[type] === true);
          } else if (type === 'NULL') {
            obj[key] = null
          }
        }
        return obj;
      }
      output = {...output, ...createSubObj(key, subItem)};
    }
    return output;
  }
  if (Array.isArray(data)) {
    let outputArray = [];
    for (const item of data) {
      const output = createObj(item)
      outputArray.push(output);
    }
    return outputArray;
  } else {
    const output = createObj(data);
    return output;
  }
};

async function initHandler(request) {
  let res;

  try {
    await init(client, dynamoClient);
    res = { code: "200", message: "Init successful" };
  } catch (e) {
    res = e;
  } finally {
    return new Response(JSON.stringify(res), optionsObj);
  }
}

async function booksHandler(request, c8qlKey) {
  let bindValue = getLastPathParam(request);
  if (c8qlKey === "ListBooks" && bindValue.includes("?category=")) {
    const queryParam = bindValue.split("?")[1].split("=");
    bindValue = decodeURI(queryParam[1]);
  }

  const scanPayload = getPayload(c8qlKey, bindValue);
  let body = [];
  await dynamoClient.scan(scanPayload, (err, res) => {
    const items = res ? res["Items"] : [];
    body = convertOutput(items);
  });

  return new Response(JSON.stringify(body), optionsObj);
}

async function cartHandler(request, c8qlKey) {
  const customerId = getCustomerId(request);
  let body = { error: true, code: 400, message: "Customer Id not provided" };
  if (customerId) {
    let bindValue = { customerId };
    let requestBody;
    let result = [];

    if (request.method !== "GET") {
      requestBody = await request.json();
      bindValue = { ...bindValue, ...requestBody };
      bindValue["_key"] = `${bindValue.customerId}:${bindValue.bookId}`;
      bindValue["cartId"] = `${bindValue.customerId}:${bindValue.bookId}`;

      if (c8qlKey === "AddToCart" || c8qlKey === "UpdateCart") {
        if (c8qlKey === "AddToCart") {
          const checkCartPayload = getPayload("FindCartItem", bindValue);
          await dynamoClient.getItem(checkCartPayload, (err, res) => {
            if (err) {
              result = err.errorMessage
            } else {
              const item = res ? res["Item"] : [];
              result = convertOutput(item);
            }
          });
          if (result.quantity) {
            bindValue["quantity"] = result.quantity + 1;
          }
        }
        const addToCartPayload = getPayload(c8qlKey, bindValue);
        await dynamoClient.putItem(addToCartPayload, (err, data) => {
          result = (!data || !data.message) ? [] : data;
        });
      }
      if (c8qlKey === "RemoveFromCart") {
        const removeFromCartPayload = getPayload(c8qlKey, bindValue);
        await dynamoClient.deleteItem(removeFromCartPayload, (err, data) => {
          result = (!data || !data.message) ? [] : data;
        });
      }
      return new Response(JSON.stringify(result), optionsObj);
    } else if (c8qlKey === "GetCartItem") {
      bindValue = { ...bindValue, bookId: getLastPathParam(request) };
    } else if (c8qlKey === "ListItemsInCart") {
      const custCartItemsPayload = getPayload("GetCustomerCartItems", bindValue.customerId);
      let custCartItems = [];
      await dynamoClient.scan(custCartItemsPayload, (err, res) => {
        const items = res ? res["Items"] : [];
        custCartItems = convertOutput(items);
      });
      for (const item of custCartItems) {
        const bookItemPayload = getPayload("GetBookItems", item.bookId);
        await dynamoClient.getItem(bookItemPayload, (err, res) => {
          if (err) {
            result = err.errorMessage
          } else {
            const items = res ? res["Item"] : [];
            const bookItems = convertOutput(items);
            result.push({ order: item, book: bookItems });
          }
        });
      }
      return new Response(JSON.stringify(result), optionsObj);
    }
    body = await executeQuery(c8qlKey, bindValue);
  }
  return new Response(JSON.stringify(body), optionsObj);
}

async function ordersHandler(request, c8qlKey) {
  const customerId = getCustomerId(request);
  let body = { error: true, code: 400, message: "Customer Id not provided" };
  if (customerId) {
    let bindValue = { customerId };
    let orderDate = Date.now();
    const orderId = `${orderDate.toString()}:${customerId}`;
    if (c8qlKey === "Checkout") {
      bindValue = {
        ...bindValue,
        orderId,
        orderDate,
      };
      body = await executeQuery(c8qlKey, bindValue);
      if (!body.error) {
        await executeQuery("AddPurchased", { orderId });
      }
    } else {
      const listOrderPayload = getPayload(c8qlKey, customerId);
      await dynamoClient.scan(listOrderPayload, (err, res) => {
        const items = res ? res["Items"] : [];
        body = convertOutput(items);
      });
    }
  }
  return new Response(JSON.stringify(body), optionsObj);
}

async function bestSellersHandler(request, c8qlKey) {
  const result = await executeQuery(c8qlKey);
  return new Response(JSON.stringify(result), optionsObj);
}

async function recommendationsHandler(request, c8qlKey) {
  const customerId = getCustomerId(request);
  let body = { error: true, code: 400, message: "Customer Id not provided" };
  if (customerId) {
    let bindValue = { customerId };
    if (c8qlKey === "GetRecommendationsByBook") {
      const bookId = getLastPathParam(request);
      bindValue = { ...bindValue, bookId };
    }
    body = await executeQuery(c8qlKey, bindValue);
  }
  return new Response(JSON.stringify(body), optionsObj);
}

async function searchHandler(request, c8qlKey) {
  const queryParam = getLastPathParam(request);
  const search = queryParam.split("?")[1].split("=")[1];
  const body = await executeQuery(c8qlKey, { search });
  return new Response(JSON.stringify(body), optionsObj);
}

async function signupHandler(request) {
  const { username, password } = await request.json();

  const encodedPassword = new TextEncoder().encode(password);

  const digestedPassword = await crypto.subtle.digest(
    {
      name: "SHA-256",
    },
    encodedPassword // The data you want to hash as an ArrayBuffer
  );
  const passwordHash = new TextDecoder("utf-8").decode(digestedPassword);
  const customerId = uuid();
  const payload = getPayload("signup", {
    customer: username,
    _key: username,
    password: passwordHash,
    customerId,
  });
  let result;

  await dynamoClient.putItem(payload, (err, data) => {
    result = { error: !!data && !!data.message };
  });
  if (!result.error) {
    const res = await executeQuery("AddFriends", { username });
  }

  const body = JSON.stringify(result);
  return new Response(body, optionsObj);
}

async function signinHandler(request) {
  const { username, password } = await request.json();
  const encodedPassword = new TextEncoder().encode(password);
  const digestedPassword = await crypto.subtle.digest(
    {
      name: "SHA-256",
    },
    encodedPassword // The data you want to hash as an ArrayBuffer
  );
  const passwordHash = new TextDecoder("utf-8").decode(digestedPassword);
  const payload = getPayload("signin", {
    customer: username
  });

  let result = [];
  let message = "User not found";
  let status = 404;
  await dynamoClient.getItem(payload, (err, res) => {
    if (err) {
      message = err.errorMessage
    } else {
      const item = res ? res["Item"] : [];
      result = convertOutput(item);
      if (result.password && result.password === passwordHash) {
        message = [result.customerId];
        status = 200;
      }
    }
  });

  const body = JSON.stringify({ message });
  return new Response(body, { status, ...optionsObj });
}

async function whoAmIHandler(request) {
  const customerId = getCustomerId(request);
  let message = "No current user";
  let status = 500;
  if (customerId !== "null" && customerId) {
    message = customerId;
    status = 200;
  }
  return new Response(JSON.stringify({ message }), { status, ...optionsObj });
}

async function getImageHandler(request) {
  const queryParam = getLastPathParam(request);
  const bookId = queryParam.split("?")[1].split("=")[1];
  // const res = await client.getValueForKey("ImagesKVTable", bookId);
  // const base64Img = res.value;
  // const response = new Response(decode(base64Img), {
  //   headers: { "Content-Type": "image/jpeg" },
  // });

  const res = await BOOK_IMAGES.get(bookId, "arrayBuffer");
  const response = new Response(res, {
    headers: { "Content-Type": "image/jpeg" },
  });

  return response;
}

async function handleEvent(event) {
  const { request } = event;
  const r = new Router();

  r.post(".*/api/init", (request) => initHandler(request));

  r.get(".*/api/whoami", (request) => whoAmIHandler(request));

  r.post(".*/api/signup", (request) => signupHandler(request));

  r.post(".*/api/signin", (request) => signinHandler(request));

  r.get(".*/api/books*", (request) => booksHandler(request, "ListBooks"));
  r.get(".*/api/books/b[0-9]+", (request) => booksHandler(request, "GetBook"));

  r.get(".*/api/cart", (request) => cartHandler(request, "ListItemsInCart"));
  r.get(".*/api/cart/b[0-9]+", (request) =>
    cartHandler(request, "GetCartItem")
  );
  r.post(".*/api/cart", (request) => cartHandler(request, "AddToCart"));
  r.put(".*/api/cart", (request) => cartHandler(request, "UpdateCart"));
  r.delete(".*/api/cart", (request) => cartHandler(request, "RemoveFromCart"));

  r.get(".*/api/orders", (request) => ordersHandler(request, "ListOrders"));
  // add all books from the Cart table to the Orders table
  // remove all entries from the Cart table for the requested customer ID
  r.post(".*/api/orders", (request) => ordersHandler(request, "Checkout"));

  r.get(".*/api/bestsellers", (request) =>
    bestSellersHandler(request, "GetBestSellers")
  );

  r.get(".*/api/recommendations", (request) =>
    recommendationsHandler(request, "GetRecommendations")
  );
  r.get(".*/api/recommendations/b[0-9]+", (request) =>
    recommendationsHandler(request, "GetRecommendationsByBook")
  );

  r.get(".*/api/getImage*", (request) => getImageHandler(request));

  r.get(".*/api/search", (request) => searchHandler(request, "Search"));

  r.get("/.*", () => handleAssetEvent(event));

  const resp = await r.route(request);
  return resp;
}
