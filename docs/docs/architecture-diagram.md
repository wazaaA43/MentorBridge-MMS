# Architecture Diagram

​```mermaid
flowchart LR
    A[Frontend - HTML/CSS/JS] -->|HTTP requests| B[Backend - Node.js + Express API]
    B --> C[(SQLite - mentoring.db)]
    B --> D[Authentication - Lerato]
    A --> E[Mentor Dashboard]
    A --> F[Mentee Dashboard]
    A --> G[Admin Dashboard]
​```
