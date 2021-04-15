import React, { useEffect, useState } from "react";

import image from "../../images/hero/hero-main.png";
import EnhancedTable from "../table/EnhanceTable";
import "./hero.css";
interface HeroProps {
  showNetworkLatency: boolean;
  // toggleNetworkLatency: () => void;
}
interface HeroState {
  apiValue: [];
}
const Hero = (props: HeroProps) => {
  const [apiValue, setApiValue] = useState([]);
  useEffect(() => {
    const values = sessionStorage.getItem("responseTime") || "[]";
    const jso = JSON.parse(values);
    setApiValue(jso);
    console.log(`Logged output: Hero -> componentDidMount -> jso`, jso);
  }, [props.showNetworkLatency]);

  return (
    <>
      {props.showNetworkLatency ? (
        <EnhancedTable
          networkapis={apiValue}
          tableHeading="API Calls and Performance"
          handleBulkUpload={() => {}}
          showSearch={false}
          loading={false}
          handleSetRows={() => {}}
        />
      ) : (
        <img
          src={image}
          className="img-fluid full-width"
          alt="The more you read the more you know"
        />
      )}
    </>
  );
};

export default Hero;
