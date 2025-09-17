import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PdfService } from '../../services/pdf/pdf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateContractDto,
  StartContractDto,
  CompleteContractDto,
  CancelContractDto,
  SignContractDto,
} from './dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  async findAll(@CurrentUser('_id') userId: string) {
    return this.contractsService.findAllForUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.contractsService.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.contractsService.update(id, updateContractDto, userId);
  }

  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @Body() startContractDto: StartContractDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.contractsService.start(id, userId);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeContractDto: CompleteContractDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.contractsService.complete(id, userId);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() cancelContractDto: CancelContractDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.contractsService.cancel(id, userId);
  }

  @Get('active')
  async findActive(@CurrentUser('_id') userId: string) {
    return this.contractsService.findActive(userId);
  }

  @Get('completed')
  async findCompleted(@CurrentUser('_id') userId: string) {
    return this.contractsService.findCompleted(userId);
  }

  @Get('pending')
  async findPending(@CurrentUser('_id') userId: string) {
    return this.contractsService.findPending(userId);
  }

  @Get(':id/agreement')
  async generateAgreement(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
  ) {
    const contract = await this.contractsService.generateAgreement(id, userId);
    const pdfBuffer = await this.pdfService.generateContractAgreement(contract);
    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="contract-${id}.pdf"`,
    });
  }

  @Post(':id/sign')
  async sign(
    @Param('id') id: string,
    @Body() signContractDto: SignContractDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.contractsService.sign(id, userId);
  }
}
