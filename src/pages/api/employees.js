import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'src', 'data', 'employees.json');

  if (req.method === 'GET') {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const employees = JSON.parse(fileContents);
    return res.status(200).json(employees);
  }

  if (req.method === 'POST') {
    const newEmployee = req.body;
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const employees = JSON.parse(fileContents);

    const exists = employees.some(
      emp => emp === newEmployee
    );
    if (exists) {
      return res.status(409).json({ error: 'Employee already exists' });
    }

    employees.push(newEmployee);
    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2), 'utf8');
    return res.status(201).json(newEmployee);
  }

  res.status(405).json({ error: 'Method not allowed' });
}