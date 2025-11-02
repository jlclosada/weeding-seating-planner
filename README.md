# 🎪 Wedding Seating Planner

  

A beautiful and functional web application for planning table arrangements and guest seating for your wedding.

Visually design your venue layout, assign guests to tables, and export your final plan.

  

![Wedding Seating Planner](https://img.shields.io/badge/Version-1.0.0-green.svg)

![React](https://img.shields.io/badge/React-18.2.0-blue.svg)

![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF.svg)

![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)

![License](https://img.shields.io/badge/License-MIT-yellow.svg)

  

---

  

## ✨ Key Features

  

### 🎨 Visual Design

-  **Elegant interface** with wedding theme

-  **Customizable round and rectangular tables**

-  **Intuitive drag and drop system**

-  **Real-time venue preview**

  

### 👥 Guest Management

-  **Add guests individually** or in batches

-  **Import from Excel/CSV** for large lists

-  **Search and filter** guests

-  **Visual assignment** to specific seats

  

### 💾 Advanced Functionality

-  **Automatic saving** in browser

-  **PDF export** with complete layout

-  **Detailed summary** per table

-  **Real-time statistics**

  

---

  

## 🚀 Quick Start

  

### Prerequisites

- Node.js 18 or higher

- npm, yarn, or pnpm

  

### Installation

  

#### 1 Clone the repository

```bash
git  clone  https://github.com/your-username/wedding-seating-planner.git
cd  wedding-seating-planner
```

#### 2 Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```
  

#### 3 Start development server

```bash
npm  run  dev
# or
yarn  dev
# or
pnpm  dev
````
  

#### 4 Open in browser

```arduino
http://localhost:5173
```
  

## 📖 User Guide

  

### 1️⃣ Create Tables

- Click **"New Table" (Nueva Mesa)**

- Choose between **round** or **rectangular** table

- Define **capacity** (number of seats)

- Name the table *(optional)*

  

---

  

### 2️⃣ Add Guests

  

#### Method 1: Manual Entry

1. Click **"Add Guests" (Añadir Invitados)**

2. Enter one name per line

3. Click **"Add" (Añadir)**

  

#### Method 2: Import from Excel/CSV

1. Click **"Import Excel/CSV" (Importar Excel/CSV)**

2. Select your file

3. Required format: Single column with names

4. Guests will be imported automatically

  

---

  

### 3️⃣ Assign Guests to Tables

  

#### Drag and Drop

- From sidebar: Click and drag a guest

- Drop on an empty seat

- To move: Drag from current seat

  

#### Assignment Features

- ✅ Full names visible in table center

- ✅ Tables automatically grow with more guests

- ✅ Tooltips with complete information

- ✅ Remove guests with one click

  

---

  

### 4️⃣ Customize Layout

  

#### Move Tables

- Click and drag any table

- Freely position on the canvas

  

#### Edit Tables

- Right-click any table

-  **Edit:** Change name, type, or capacity

-  **View Summary:** Complete guest list

-  **Delete:** Remove table and free guests

  

---

  

### 5️⃣ Export and Save

  

#### Save Progress

- System automatically saves

- Use **"Save Progress"** for manual save

- Data stored in your browser

  

#### Export PDF

- Click **"Export PDF"**

-  **Page 1:** Complete visual layout

-  **Page 2:** Detailed table listing

-  **Page 3:** General summary and statistics

  

## 📊 Supported Import Formats

  

### Excel (.xlsx, .xls)

**Column A:**

Ana García

Carlos López

María Rodríguez

Juan Pérez

  

### CSV

Ana García

Carlos López

María Rodríguez

Juan Pérez

  

#### Or with header:

"Names"

"Ana García"

"Carlos López"

"María Rodríguez"

  

## 🎯 Usage Tips

  

### For Efficient Planning

- Start with structure: Create all tables first

- Import complete list: Use import function

- Assign by groups: Family, groom's friends, bride's friends

- Check statistics: Maintain balance between tables

- Export PDF: Share with your wedding planning team

  

### Best Practices

- 💡 Name tables thematically (flowers, cities, etc.)

- 💡 Group by relationship at nearby tables

- 💡 Leave empty tables for unexpected guests

- 💡 Use summary to verify assignments

  

---

  

## 🛠️ Project Structure
wedding-seating-planner/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   ├── components/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md

  

## 📦 Key Dependencies

-  **React** – Main framework

-  **Vite** – Build tool and dev server

-  **Tailwind CSS** – Styling and design

-  **Framer Motion** – Animations

-  **html2canvas** – Screenshot for PDF

-  **jsPDF** – PDF generation

-  **xlsx** – Excel file processing

-  **Lucide React** – Icons

  

---

  

## 🔧 Customization

  

### 🎨 Colors and Theme

You can customize the color palette in `index.css`:

  

```css

:root  {

--color-primary:  #3C2A21;

--color-secondary:  #E2C275;

--color-accent:  #F4D160;

--color-background:  #FDF6F0;
````

## 🤝 Contributing

  

Contributions  are  welcome!

  

### Steps to Contribute

  

1.  **Fork  the  project**

2.  **Create  a  feature  branch**

```bash
git checkout -b feature/AmazingFeature
````
3.  **Commit your changes**

```bash
git  commit  -m  'Add some AmazingFeature'
````
4.  **Push  to  the  branch**

```bash
git push origin feature/AmazingFeature
````
  

5.  **Open a Pull Request**

  

## 📄 License

  

This project was created by **Jose Luis Cáceres Losada**

  

## 👰 Need Help?

  

- Check this user guide

- Review common issues

- Open an issue on [GitHub](https://github.com/your-username/wedding-seating-planner/issues)
