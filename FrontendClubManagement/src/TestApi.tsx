import { useEffect } from "react";

export default function TestApi() {
  const callApi = async () => {
    const res = await fetch("http://localhost:8080/test/success");
    const data = res.json();
    console.log(data);
  };

  useEffect(() => {
    callApi();
  }, []);

  return <></>;
}
