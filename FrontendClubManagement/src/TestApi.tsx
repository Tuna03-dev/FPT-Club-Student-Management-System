import { useEffect } from "react";
import axiosClient from "./api/axiosClient";
export default function TestApi() {
  const callApi = async () => {
    try {
      const res = await axiosClient.get<string>("/test/user-not-found");
      console.log(res);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    callApi();
  }, []);

  return <></>;
}
