import React from "react";
import "../../common/styles/productRow.css";
import StarRating from "../../common/starRating/StarRating";
import { API } from "../../apiCalls";
import AddToCart from "../../common/AddToCart";
import FriendRecommendations from "../../common/friendRecommendations/FriendRecommendations";
import { Book } from "../bestSellers/BestSellerProductRow";

interface ProductRowProps {
  book: Book;
  bookId: string;
}

interface ProductRowState {
  book: Book | undefined;
}

export class ProductRow extends React.Component<
  ProductRowProps,
  ProductRowState
> {
  constructor(props: ProductRowProps) {
    super(props);

    this.state = {
      book: undefined,
    };
  }

  componentDidMount() {
    this.setState({ book: this.props.book });
    // API.get("books", `/books/${this.props.bookId}`, null)
    //   .then((response) => this.setState({ book: response }))
    //   .catch((error) => console.error(error));
  }

  render() {
    if (!this.state.book) return null;

    return (
      <div className="white-box">
        <div className="media">
          <div className="media-left media-middle no-padding">
            <img
              className="product-thumb border"
              src={`./api/getImage?bookId=${this.state.book["bookId"]}`}
              alt={`${this.state.book.name} cover`}
            />
          </div>
          <div className="media-body  padding-20">
            <h3 className="media-heading">
              {this.state.book.name}
              <small className="pull-right ">${this.state.book.price}</small>
            </h3>
            <p className="no-margin">
              <small>{this.state.book.category}</small>
            </p>
            <FriendRecommendations bookId={this.props.bookId} />
            <div>
              <span style={{ display: "block" }}> Rating</span>
              <span>
                <AddToCart
                  bookId={this.state.book["bookId"]}
                  price={this.state.book.price}
                />
              </span>
            </div>
            <StarRating stars={this.state.book.rating} />
          </div>
        </div>
      </div>
    );
  }
}

export default ProductRow;
