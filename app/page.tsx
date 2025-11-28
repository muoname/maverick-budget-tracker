"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Loader2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/middleware/supabase";
import { Transactions } from "@/types/Transactions";

type vehicleDropDownType = {
  value: number;
  name: string;
}[];

type typeDropDownType = {
  value: string;
  name: string;
}[];

type filterTypes = {
  date: string;
  description: string;
  vehicle: string;
  type: string;
  amount: string;
};

const initFilterTypes = {
  date: "",
  description: "",
  vehicle: "",
  type: "",
  amount: "",
};

const onLoad = async (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setRows: React.Dispatch<React.SetStateAction<Transactions[]>>
) => {
  setLoading(true);

  const { data, error } = await supabase
    .from("Transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching", error);
    setLoading(false);
  } else {
    const rows = data.map((row) => ({
      id: row.id,
      vehicle: row.vehicle,
      amount: row.amount,
      type: row.type,
      status: row.status,
      date: row.date ?? "",
      description: row.description,
    }));
    setRows(rows);
    setLoading(false);
  }
};

const getVehicles = async (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setVehicleDropDown: React.Dispatch<React.SetStateAction<vehicleDropDownType>>,
  setTypeDropDown: React.Dispatch<React.SetStateAction<typeDropDownType>>
) => {
  setLoading(true);
  const vehicleDropDown: vehicleDropDownType = [];
  const typeDropDown: typeDropDownType = [];
  const { data, error } = await supabase
    .from("Vehicles")
    .select("*, color:Color(*), model:Model(*, brand:Brands(*))")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching", error);
  } else {
    data.forEach((item) => {
      vehicleDropDown.push({ value: item.id, name: item.name });
    });

    setLoading(false);
  }

  typeDropDown.push({ value: "Income", name: "Income" });
  typeDropDown.push({ value: "Expense", name: "Expense" });

  setVehicleDropDown(vehicleDropDown);
  setTypeDropDown(typeDropDown);
};

// --- Handlers ---
const handleInputChange = async (
  id: number,
  field: keyof Transactions,
  value: string,
  rows: Transactions[],
  setRows: React.Dispatch<React.SetStateAction<Transactions[]>>
) => {
  let updatedValue: string | number;

  if (field === "amount") {
    updatedValue = parseFloat(value) || 0;
  } else if (field === "vehicle") {
    updatedValue = parseInt(value) || 1;
  } else {
    updatedValue = value;
  }

  setRows((prev) =>
    prev.map((row) => {
      if (row.id === id) return { ...row, [field]: updatedValue };
      return row;
    })
  );

  const rowToUpdate = rows.find((r) => r.id === id);
  if (rowToUpdate) {
    const updates = { ...rowToUpdate, [field]: value };
    const dbPayload = {
      id: updates.id,
      vehicle: updates.vehicle,
      amount: updates.amount,
      type: updates.type,
      status: updates.status,
      description: updates.description,
      date: updates.date,
    };

    await supabase.from("Transactions").update(dbPayload).eq("id", id);
  }
};

const getFilter = async (
  setFilter: React.Dispatch<React.SetStateAction<filterTypes>>,
  filter: filterTypes,
  field: keyof filterTypes,
  inputValue: string,
  setRows: React.Dispatch<React.SetStateAction<Transactions[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setLoading(true);

  let valueToFilter: string | number | undefined;

  const trimmedValue = inputValue.trim();

  if (trimmedValue.length === 0) {
    valueToFilter = "";
  } else if (field === "vehicle" || field === "amount") {
    const parsedNumber = parseInt(inputValue);
    valueToFilter = isNaN(parsedNumber) ? undefined : parsedNumber;
  } else if (field === "description" || field === "date" || field === "type") {
    valueToFilter = inputValue.length > 0 ? inputValue : undefined;
  }

  const newFilter: filterTypes = {
    ...filter,
    [field]: valueToFilter,
  } as filterTypes;
  setFilter(newFilter);

  const { date, description, vehicle, type, amount } = newFilter;

  let query = supabase.from("Transactions").select("*");
  if (notNullOrEmpty(date)) {
    query = query.eq("date", date as string);
  }
  if (notNullOrEmpty(description)) {
    query = query.ilike("description", `%${description as string}%`);
  }
  if (notNullOrEmpty(vehicle)) {
    query = query.eq("vehicle", Number(vehicle));
  }
  if (notNullOrEmpty(type)) {
    query = query.eq("type", type as NonNullable<"Income" | "Expense">);
  }
  if (notNullOrEmpty(amount)) {
    query = query.eq("amount", Number(amount));
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching", error);
    setLoading(false);
  } else {
    const rows = data.map((row) => ({
      id: row.id,
      vehicle: row.vehicle,
      amount: row.amount,
      type: row.type,
      status: row.status,
      date: row.date ?? "",
      description: row.description,
    }));
    setRows(rows);
    setLoading(false);
  }
};

const notNullOrEmpty = (input: number | string | null | undefined) => {
  if (input === null || input === undefined) return false;
  if (input.toString().trim().length > 0) return true;
};

const addRow = async (
  setRows: React.Dispatch<React.SetStateAction<Transactions[]>>
) => {
  const newRow = {
    vehicle: 1,
    amount: 0,
    type: "Income" as "Income" | "Expense" | undefined,
    status: "Not Yet Paid" as
      | "Not Yet Paid"
      | "Pending"
      | "Completed"
      | "Missing in Action"
      | null
      | undefined,
    description: "",
  };

  const { data, error } = await supabase
    .from("Transactions")
    .insert([newRow])
    .select("*")
    .single();

  if (error) {
    console.error("Error adding row", error);
    return;
  }

  const formattedRow: Transactions = {
    id: data.id,
    vehicle: data.vehicle,
    amount: data.amount,
    type: data.type,
    status: data.status,
    description: data.description,
    date: data.date ?? "",
  };
  setRows((prev) => [formattedRow, ...prev]);
};

const deleteRow = async (
  id: number,
  setRows: React.Dispatch<React.SetStateAction<Transactions[]>>
) => {
  const { error } = await supabase.from("Transactions").delete().eq("id", id);
  if (!error) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }
};

const fmt = (num: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(num);

export default function Home() {
  const [rows, setRows] = useState<Transactions[]>([]);
  const [filter, setFilter] = useState<filterTypes>(initFilterTypes);
  const [loading, setLoading] = useState(true);
  const [vehicleDropDown, setVehicleDropDown] = useState<vehicleDropDownType>(
    []
  );
  const [typeDropDown, setTypeDropDown] = useState<typeDropDownType>([]);

  // --- Fetch Data from Supabase ---
  useEffect(() => {
    onLoad(setLoading, setRows);
    getVehicles(setLoading, setVehicleDropDown, setTypeDropDown);
  }, []);

  // --- Calculations ---
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    rows.forEach((row) => {
      if (row.type === "Income") {
        totalIncome += row.amount;
      } else {
        totalExpense += row.amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [rows]);

  // --- Export Function ---
  const exportToCSV = () => {
    const headers = ["Date", "Description", "Category", "Income", "Expense"];
    const csvRows = rows.map((row) => [
      row.date,
      `"${row.description?.replace(/"/g, '""')}"`,
      `"${row.type.replace(/"/g, '""')}"`,
      row.amount,
      row.type,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "budget_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* Header Section */}
      <div className="w-full mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              Income & Expense Tracker
            </h1>
            <p className="text-slate-500 mt-1">
              Connected to Supabase Database
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onLoad(setLoading, setRows)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Dashboard Cards (Same as before) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Total Income
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {fmt(totals.income)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <ArrowUpCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {fmt(totals.expense)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <ArrowDownCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                Net Balance
              </p>
              <p
                className={`text-2xl font-bold ${
                  totals.balance >= 0 ? "text-blue-600" : "text-red-600"
                }`}
              >
                {fmt(totals.balance)}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                totals.balance >= 0 ? "bg-blue-50" : "bg-red-50"
              }`}
            >
              <DollarSign
                className={`w-6 h-6 ${
                  totals.balance >= 0 ? "text-blue-600" : "text-red-600"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Spreadsheet Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-s text-slate-500 uppercase bg-slate-50 ">
                    <tr>
                      <th className="px-5 py-3 w-40">Date</th>
                      <th className="px-4 py-3 min-w-[100px]">Description</th>
                      <th className="px-4 py-3 w-48">Rental</th>
                      <th className="px-4 py-3 w-48">Transaction Type</th>
                      <th className="px-4 py-3 w-32 text-right text-green-700">
                        Income
                      </th>
                      <th className="px-4 py-3 w-32 text-right text-red-700">
                        Expense
                      </th>
                      <th className="px-4 py-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y  text-slate-500 bg-slate-50 divide-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 w-40">
                        <input
                          type="date"
                          value={filter.date as string}
                          onChange={(e) =>
                            getFilter(
                              setFilter,
                              filter,
                              "date",
                              e.target.value,
                              setRows,
                              setLoading
                            )
                          }
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-700 p-1"
                        />
                      </th>
                      <th className="px-4 py-2 min-w-[100px]">
                        <input
                          type="text"
                          value={filter.description as string}
                          onChange={(e) => {
                            const newFilter: filterTypes = {
                              ...filter,
                              description: e.target.value,
                            } as filterTypes;
                            setFilter(newFilter);
                          }}
                          onBlur={(e) =>
                            getFilter(
                              setFilter,
                              filter,
                              "description",
                              e.target.value,
                              setRows,
                              setLoading
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          className="w-full bg-transparent text-slate-700 p-1 border border-slate-300 rounded-md focus:ring-0"
                        />
                      </th>
                      <th className="px-4 py-2 w-48">
                        <select
                          value={filter.vehicle as string}
                          onChange={(e) =>
                            getFilter(
                              setFilter,
                              filter,
                              "vehicle",
                              e.target.value,
                              setRows,
                              setLoading
                            )
                          }
                          className="w-full bg-transparent border border-slate-300 rounded focus:ring-0 text-slate-700 p-1 cursor-pointer"
                        >
                          <option key={""} value={""}></option>
                          {vehicleDropDown.map((vehicle) => (
                            <option key={vehicle.name} value={vehicle.value}>
                              {vehicle.name}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-4 py-2 w-48">
                        <select
                          value={filter.type as string}
                          onChange={(e) =>
                            getFilter(
                              setFilter,
                              filter,
                              "type",
                              e.target.value,
                              setRows,
                              setLoading
                            )
                          }
                          className="w-full bg-transparent border border-slate-300 rounded focus:ring-0 text-slate-700 p-1 cursor-pointer"
                        >
                          <option key={""} value={""}></option>
                          {typeDropDown.map((type) => (
                            <option key={type.name} value={type.value}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </th>
                      <th className="px-4 py-2 w-32 text-right text-green-700"></th>
                      <th className="px-4 py-2 w-32 text-right text-red-700"></th>
                      <th className="px-4 py-2 w-16 text-center">
                        <button
                          onClick={() => {
                            setFilter(initFilterTypes);
                            onLoad(setLoading, setRows);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </th>
                    </tr>
                  </tbody>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        {/* Inputs: Note the onBlur vs onChange optimization recommendation */}
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "date",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 p-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.description as string}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "description",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            className="w-full bg-transparent border border-slate-300 rounded-md focus:ring-0 text-slate-700 p-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.vehicle as number}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "vehicle",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            className="w-full bg-transparent border border-slate-300 rounded focus:ring-0 text-slate-700 p-1 cursor-pointer"
                          >
                            {vehicleDropDown.map((vehicle) => (
                              <option key={vehicle.name} value={vehicle.value}>
                                {vehicle.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.type}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "type",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            className="w-full bg-transparent border border-slate-300 rounded focus:ring-0 text-slate-700 p-1 cursor-pointer"
                          >
                            {typeDropDown.map((type) => (
                              <option key={type.name} value={type.value}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.type === "Income" ? row.amount : ""}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "amount",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            disabled={row.type !== "Income"}
                            className="w-full bg-green-50/50 border border-slate-300 focus:ring-0 text-right text-green-700 p-1 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.type === "Expense" ? row.amount : ""}
                            onChange={(e) =>
                              handleInputChange(
                                row.id,
                                "amount",
                                e.target.value,
                                rows,
                                setRows
                              )
                            }
                            disabled={row.type !== "Expense"}
                            className="w-full bg-red-50/50 border border-slate-300 focus:ring-0 text-right text-red-700 p-1 rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => deleteRow(row.id, setRows)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-right">
                        Totals:
                      </td>
                      <td className="px-6 py-3 text-right text-green-700">
                        {fmt(totals.income)}
                      </td>
                      <td className="px-6 py-3 text-right text-red-700">
                        {fmt(totals.expense)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => addRow(setRows)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Transaction Row
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
