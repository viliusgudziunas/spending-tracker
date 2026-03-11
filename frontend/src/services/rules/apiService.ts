import axios from "axios";
import { API_URL } from "../../config";
import { parseApiCategories, parseApiCategory, parseApiFilter } from "./api.parser";
import { Category, Filter } from "./api.types.parsed";
import { parseIntoCreateApiFilterPayload, parseIntoUpdateApiFilterPayload } from "./apiService.parser";

export interface CreateCategoryPayload {
    name: string;
}

export interface UpdateCategoryPayload {
    name?: string;
    position?: number;
}

export interface CreateFilterPayload {
    name: string;
    categoryId: string;
    ruleGroups: CreateRuleGroupPayload[];
}

export interface CreateRuleGroupPayload {
    operator: string;
    rules: CreateRulePayload[];
}

export interface CreateRulePayload {
    type: string;
    operator: string;
    value: string;
}

export interface UpdateFilterPayload {
    name: string;
    position?: number;
    categoryId: string;
    ruleGroups: UpdateRuleGroupPayload[];
}

export interface UpdateRuleGroupPayload {
    operator: string;
    rules: UpdateRulePayload[];
}

export interface UpdateRulePayload {
    type: string;
    operator: string;
    value: string;
}

export interface UpdateFilterPositionPayload {
    position: number;
}

const createCategory = async (payload: CreateCategoryPayload): Promise<Category> => {
    try {
        const response = await axios.post(`${API_URL}/categories`, payload);
        return parseApiCategory(response.data);
    } catch (error) {
        console.error("Error creating category:", error);
        throw error;
    }
};

const updateCategory = async (categoryId: string, payload: UpdateCategoryPayload): Promise<Category> => {
    try {
        const response = await axios.patch(`${API_URL}/categories/${categoryId}`, payload);
        return parseApiCategory(response.data);
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
};

const fetchCategories = async (): Promise<Category[]> => {
    try {
        const response = await axios.get(`${API_URL}/categories`);
        return parseApiCategories(response.data);
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
};

const createFilter = async (payload: CreateFilterPayload): Promise<Filter> => {
    try {
        const parsedPayload = parseIntoCreateApiFilterPayload(payload);
        const response = await axios.post(`${API_URL}/filters`, parsedPayload);
        return response.data;
    } catch (error) {
        console.error("Error creating filter:", error);
        throw error;
    }
};

const updateFilter = async (filterId: string, payload: UpdateFilterPayload): Promise<Filter> => {
    try {
        const parsedPayload = parseIntoUpdateApiFilterPayload(payload);
        const response = await axios.put(`${API_URL}/filters/${filterId}`, parsedPayload);
        return response.data;
    } catch (error) {
        console.error("Error updating filter:", error);
        throw error;
    }
};

const updateFilterPosition = async (filterId: string, payload: UpdateFilterPositionPayload): Promise<Filter> => {
    try {
        const response = await axios.patch(`${API_URL}/filters/${filterId}`, payload);
        return parseApiFilter(response.data);
    } catch (error) {
        console.error("Error updating filter position:", error);
        throw error;
    }
};

const deleteFilter = async (filterId: string): Promise<void> => {
    try {
        await axios.delete(`${API_URL}/filters/${filterId}`);
    } catch (error) {
        console.error("Error deleting filter:", error);
        throw error;
    }
};

export default {
    createCategory,
    createFilter,
    fetchCategories,
    updateCategory,
    updateFilter,
    updateFilterPosition,
    deleteFilter,
};
