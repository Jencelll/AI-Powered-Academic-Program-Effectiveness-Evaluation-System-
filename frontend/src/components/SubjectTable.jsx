import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

const SubjectTable = ({ data }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>A list of subjects and their analysis.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Passed</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Pass Rate (%)</TableHead>
            <TableHead>Deficiencies</TableHead>
            <TableHead>Recommendations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((subject, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{subject.course}</TableCell>
              <TableCell>{subject.program}</TableCell>
              <TableCell>{subject.enrolled}</TableCell>
              <TableCell>{subject.passed}</TableCell>
              <TableCell>{subject.failed}</TableCell>
              <TableCell>
                <Badge variant={subject.pass_rate >= 80 ? "default" : subject.pass_rate >= 70 ? "secondary" : "destructive"}>
                  {subject.pass_rate.toFixed(2)}%
                </Badge>
              </TableCell>
              <TableCell>{subject.num_def}</TableCell>
              <TableCell className="max-w-xs text-sm truncate">{subject.recommendation}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubjectTable;