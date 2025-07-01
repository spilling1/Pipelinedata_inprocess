import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { CustomerJourneyData } from '../hooks/useCustomerJourneyData';

interface CustomerJourneyTableProps {
  customers: CustomerJourneyData[];
}

const CustomerJourneyTable: React.FC<CustomerJourneyTableProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20); // Limit to 20 for performance

  const getStageColor = (stage: string) => {
    if (stage.includes('Closed Won')) return 'bg-green-100 text-green-800';
    if (stage.includes('Closed Lost')) return 'bg-red-100 text-red-800';
    if (stage.includes('Developing')) return 'bg-blue-100 text-blue-800';
    if (stage.includes('ROI')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Journey Details</CardTitle>
        <CardDescription>
          Individual customer touchpoints, CAC, and journey progression
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Touches</TableHead>
                <TableHead className="text-center">Total CAC</TableHead>
                <TableHead className="text-center">Pipeline</TableHead>
                <TableHead className="text-center">Current Stage</TableHead>
                <TableHead className="text-center">Campaign Types</TableHead>
                <TableHead className="text-center">Journey Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.customerId}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{customer.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {customer.customerId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={customer.touches > 1 ? "default" : "outline"}>
                      {customer.touches}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatCurrency(customer.totalCAC)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <div className="font-medium">
                        {formatCurrency(customer.pipelineValue)}
                      </div>
                      {customer.closedWonValue > 0 && (
                        <div className="text-xs text-green-600">
                          +{formatCurrency(customer.closedWonValue)} Won
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStageColor(customer.currentStage)}>
                      {customer.currentStage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {customer.campaignTypes.slice(0, 2).map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      {customer.campaignTypes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{customer.campaignTypes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>
                      <div className="font-medium">{customer.journeyPeriod}d</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(customer.firstTouchDate).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {customers.length > 20 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing top 20 customers. Use search to find specific customers.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerJourneyTable;