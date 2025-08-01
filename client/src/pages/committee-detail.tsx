import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Bus } from "lucide-react";
import { Link } from "wouter";

export default function CommitteeDetail() {
  const [, params] = useRoute("/committees/:id");
  const committeeId = params?.id;

  const { data: committee, isLoading } = useQuery({
    queryKey: ['/api/committees', committeeId],
    queryFn: () => api.getCommittee(committeeId!),
    enabled: !!committeeId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="bg-white rounded-lg p-8">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Committee Not Found</h1>
              <p className="text-slate-gray mb-4">The requested committee could not be found.</p>
              <Link href="/committees">
                <Button>Back to Committees</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPoliticalGroupColor = (group?: string) => {
    const colors: Record<string, string> = {
      'EPP': 'bg-blue-100 text-blue-800',
      'S&D': 'bg-red-100 text-red-800',
      'RE': 'bg-green-100 text-green-800',
      'ID': 'bg-yellow-100 text-yellow-800',
      'ECR': 'bg-purple-100 text-purple-800',
      'Greens/EFA': 'bg-emerald-100 text-emerald-800',
      'GUE/NGL': 'bg-pink-100 text-pink-800',
    };
    return colors[group || ''] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/committees">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Committees
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Committee Details</h1>
        </div>

        {/* Committee Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{committee.name}</CardTitle>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {committee.code}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {committee.coordinatorName && (
                <div className="flex items-center space-x-3">
                  <Bus className="w-6 h-6 text-slate-gray" />
                  <div>
                    <p className="font-medium">Chairperson</p>
                    <p className="text-slate-gray">{committee.coordinatorName}</p>
                    {committee.coordinatorGroup && (
                      <Badge className={getPoliticalGroupColor(committee.coordinatorGroup)}>
                        {committee.coordinatorGroup}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-slate-gray" />
                <div>
                  <p className="font-medium">Total Members</p>
                  <p className="text-slate-gray">{committee.members?.length || 0} MEPs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Committee Members</CardTitle>
          </CardHeader>
          <CardContent>
            {!committee.members || committee.members.length === 0 ? (
              <p className="text-slate-gray text-center py-8">No members found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Political Group</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {committee.members.map((membership) => (
                      <TableRow key={membership.mep.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={membership.mep.photoUrl} alt={membership.mep.fullName} />
                              <AvatarFallback>
                                {getInitials(membership.mep.firstName, membership.mep.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{membership.mep.fullName}</div>
                              <div className="text-sm text-slate-gray">
                                MEP since {new Date(membership.mep.createdAt).getFullYear()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-900">{membership.mep.country}</span>
                        </TableCell>
                        <TableCell>
                          {membership.mep.politicalGroupAbbr && (
                            <Badge className={getPoliticalGroupColor(membership.mep.politicalGroupAbbr)}>
                              {membership.mep.politicalGroupAbbr}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {membership.role && (
                            <Badge variant="outline">{membership.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/meps/${membership.mep.id}`}>
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
