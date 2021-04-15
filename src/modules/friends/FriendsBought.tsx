import React from "react";
import { ProductRow } from "./ProductRow";
import { API } from "../../apiCalls";

interface FriendsBoughtProps {}

interface FriendsBoughtState {
  isLoading: boolean;
  recommendations: any[]; // FIXME
}

export class FriendsBought extends React.Component<
  FriendsBoughtProps,
  FriendsBoughtState
> {
  constructor(props: FriendsBoughtProps) {
    super(props);

    this.state = {
      isLoading: true,
      recommendations: [],
    };
  }

  componentDidMount() {
    API.get("recommendations", "/recommendations", null)
      .then((response) => {
        this.setState({
          recommendations: [
            {
              _id: "BooksTable/b3",
              _key: "b3",
              _rev: "_cAY1xci--_",
              author: "Kristin Cavallari",
              bookId: "b3",
              category: "Cookbooks",
              name:
                "True Comfort: More Than 100 Cozy Recipes Free of Gluten and Refined Sugar: A Gluten Free Cookbook",
              price: 17.52,
              rating: 4.8,
            },
            {
              _id: "BooksTable/b2",
              _key: "b2",
              _rev: "_cAY1xY2--_",
              author: "Steve Doocy",
              bookId: "b2",
              category: "Cookbooks",
              name:
                "The Happy in a Hurry Cookbook: 100-Plus Fast and Easy New Recipes That Taste Like Home",
              price: 17.99,
              rating: 4.6,
            },
            {
              _id: "BooksTable/b39",
              _key: "b39",
              _rev: "_cAY1y6q--_",
              author: "Laine Campbell",
              bookId: "b39",
              category: "Database",
              name:
                "Database Reliability Engineering: Designing and Operating Resilient Database Systems",
              price: 41.49,
              rating: 4.6,
            },
            {
              _id: "BooksTable/b40",
              _key: "b40",
              _rev: "_cAY1z-6--_",
              author: "Luc Perkins",
              bookId: "b40",
              category: "Database",
              name:
                "Seven Databases in Seven Weeks: A Guide to Modern Databases and the NoSQL Movement",
              price: 41.99,
              rating: 4.3,
            },
            {
              _id: "BooksTable/b66",
              _key: "b66",
              _rev: "_cAY11TW--_",
              author: "Steve Cory",
              bookId: "b66",
              category: "Home Improvement",
              name: "Affordable Bathroom Upgrades (Home Improvement)",
              price: 19.95,
              rating: 3.7,
            },
            {
              _id: "BooksTable/b67",
              _key: "b67",
              _rev: "_cAY11XK--_",
              author: "Editors of Cool Springs Press",
              bookId: "b67",
              category: "Home Improvement",
              name:
                "Black & Decker The Complete Photo Guide to Home Repair, 4th Edition (Black & Decker Complete Guide)",
              price: 13.58,
              rating: 4.5,
            },
            {
              _id: "BooksTable/b23",
              _key: "b23",
              _rev: "_cAY11ma--_",
              author: "Collin Brantmeyer",
              bookId: "b23",
              category: "Cars",
              name: "Death of a Car Salesman",
              price: 18.99,
              rating: 4.7,
            },
            {
              _id: "BooksTable/b24",
              _key: "b24",
              _rev: "_cAY11qO--_",
              author: "DK",
              bookId: "b24",
              category: "Cars",
              name: "Classic Car: The Definitive Visual History",
              price: 27.24,
              rating: 4.8,
            },
            {
              _id: "BooksTable/b26",
              _key: "b26",
              _rev: "_cAY12RO--_",
              author: "Phillip Gardner",
              bookId: "b26",
              category: "Woodwork",
              name:
                "Practical Weekend Projects for Woodworkers: 35 Projects to Make for Every Room of Your Home (IMM Lifestyle Books) Easy Step-by-Step Instructions with Exploded Diagrams, Templates, & How-To Photographs",
              price: 17.99,
              rating: 4.4,
            },
            {
              _id: "BooksTable/b27",
              _key: "b27",
              _rev: "_cAY12VW--_",
              author: "Bob Flexner",
              bookId: "b27",
              category: "Woodwork",
              name:
                "Understanding Wood Finishing: How to Select and Apply the Right Finish",
              price: 36.67,
              rating: 4.8,
            },
            {
              _id: "BooksTable/b25",
              _key: "b25",
              _rev: "_cAY12NW--_",
              author: "Albert Jackson",
              bookId: "b25",
              category: "Woodwork",
              name:
                "The Complete Manual of Woodworking: A Detailed Guide to Design, Techniques, and Tools for the Beginner and Expert",
              price: 10.07,
              rating: 4.7,
            },
            {
              _id: "BooksTable/b29",
              _key: "b29",
              _rev: "_cAY1xvW--_",
              author: "Mely Martínez",
              bookId: "b29",
              category: "Cookbooks",
              name:
                "The Mexican Home Kitchen: Traditional Home-Style Recipes That Capture the Flavors and Memories of Mexico",
              price: 21.2,
              rating: 4.9,
            },
            {
              _id: "BooksTable/b28",
              _key: "b28",
              _rev: "_cAY12ZK--_",
              author: "DK Publishing",
              bookId: "b28",
              category: "Woodwork",
              name:
                "Woodwork: A Step-by-Step Photographic Guide to Successful Woodworking",
              price: 32.74,
              rating: 4.7,
            },
            {
              _id: "BooksTable/b5",
              _key: "b5",
              _rev: "_cAY1yb6--_",
              author: "Michael Hernandez",
              bookId: "b5",
              category: "Database",
              name:
                "Database Design for Mere Mortals: A Hands-On Guide to Relational Database Design",
              price: 43.98,
              rating: 4.4,
            },
            {
              _id: "BooksTable/b9",
              _key: "b9",
              _rev: "_cAY1zTq--_",
              author: "Maria Tatar",
              bookId: "b9",
              category: "Fairy Tales",
              name: "The Classic Fairy Tales",
              price: 26.99,
              rating: 4.5,
            },
            {
              _id: "BooksTable/b30",
              _key: "b30",
              _rev: "_cAY1xz6--_",
              author: "Matty Matheson",
              bookId: "b30",
              category: "Cookbooks",
              name: "Home Style Cookery: A Home Cookbook",
              price: 25.49,
              rating: 4.9,
            },
            {
              _id: "BooksTable/b1",
              _key: "b1",
              _rev: "_cAY1xUW--_",
              author: "Ina Garten",
              bookId: "b1",
              category: "Cookbooks",
              name: "Modern Comfort Food: A Barefoot Contessa Cookbook",
              price: 21,
              rating: 4.5,
            },
          ],
          isLoading: false,
        });
      })
      .then(() => {
        console.log(
          `performance.getEntriesByType("navigation")`,
          performance.getEntriesByType("navigation")
        );
        console.log(
          `performance.getEntriesByType("resource")`,
          performance.getEntriesByType("resource")
        );
      })
      .catch((error) => {
        console.log(
          `performance.error("resource")`,
          performance.getEntriesByType("resource")
        );
        console.error(error);
      });
  }

  render() {
    if (this.state.isLoading) return null;
    console.log("this.state", this.state.recommendations[0].bookId);

    return (
      <div className="well-bs no-padding-top col-md-12 no-border">
        <div className="container-category">
          <h3>Books your friends have bought</h3>
        </div>
        {this.state.recommendations.slice(0, 5).map((recommendation) => (
          <ProductRow
            book={recommendation}
            bookId={recommendation.bookId}
            key={recommendation._key}
          />
        ))}
      </div>
    );
  }
}

export default FriendsBought;
