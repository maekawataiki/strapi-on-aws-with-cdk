import { aws_route53, aws_route53_targets, Duration } from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface Route53RecordProps {
  distribution: IDistribution;
  hostedZoneDomainName: string;
  applicationName: string;
}

export class Route53Record extends Construct {
  constructor(scope: Construct, id: string, props: Route53RecordProps) {
    super(scope, id);

    const { distribution, hostedZoneDomainName, applicationName } = props!;

    const hostedZone = aws_route53.HostedZone.fromLookup(this, 'hosted-zone', {
      domainName: hostedZoneDomainName,
    });

    new aws_route53.ARecord(this, 'a-dns-record', {
      recordName: applicationName,
      zone: hostedZone,
      target: aws_route53.RecordTarget.fromAlias(
        new aws_route53_targets.CloudFrontTarget(distribution)
      ),
      ttl: Duration.minutes(1),
    });

    new aws_route53.AaaaRecord(this, 'aaaa-dns-record', {
      recordName: applicationName,
      zone: hostedZone,
      target: aws_route53.RecordTarget.fromAlias(
        new aws_route53_targets.CloudFrontTarget(distribution)
      ),
      ttl: Duration.minutes(1),
    });
  }
}
