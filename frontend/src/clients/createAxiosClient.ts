import axios, { AxiosInstance } from "axios";

export function createAxiosClient(baseURL: string): AxiosInstance {
    return axios.create({ baseURL });
}
