import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contract } from '../../database/schemas/contract.schema';
import { User } from '../../database/schemas/user.schema';
import { ContractStatus } from '../../common/enums/contract-status.enum';
import { UpdateContractDto } from './dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async findAllForUser(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        deletedAt: null,
      })
      .populate('clientId', 'profile email')
      .populate('freelancerId', 'profile email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel
      .findOne({
        _id: id,
        $or: [{ clientId: userId }, { freelancerId: userId }],
        deletedAt: null,
      })
      .populate('clientId', 'profile email')
      .populate('freelancerId', 'profile email')
      .populate('jobId', 'title description')
      .populate('proposalId')
      .exec();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async update(
    id: string,
    updateContractDto: UpdateContractDto,
    userId: string,
  ): Promise<Contract> {
    const contract = await this.contractModel.findOne({
      _id: id,
      $or: [{ clientId: userId }, { freelancerId: userId }],
      deletedAt: null,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Only allow updates if contract hasn't started
    if (contract.startDate && contract.startDate <= new Date()) {
      throw new BadRequestException(
        'Cannot update contract that has already started',
      );
    }

    // Only client or freelancer can update
    if (
      contract.clientId.toString() !== userId &&
      contract.freelancerId.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this contract',
      );
    }

    Object.assign(contract, updateContractDto);
    return contract.save();
  }

  async start(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findOne({
      _id: id,
      $or: [{ clientId: userId }, { freelancerId: userId }],
      deletedAt: null,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (
      contract.status !== ContractStatus.PENDING &&
      contract.status !== ContractStatus.ACTIVE
    ) {
      throw new BadRequestException('Contract cannot be started');
    }

    contract.status = ContractStatus.ACTIVE;
    contract.startDate = new Date();

    return contract.save();
  }

  async complete(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findOne({
      _id: id,
      $or: [{ clientId: userId }, { freelancerId: userId }],
      deletedAt: null,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be completed');
    }

    if (contract.clientId.toString() !== userId) {
      throw new ForbiddenException('Only the client can complete the contract');
    }

    contract.status = ContractStatus.COMPLETED;
    contract.completedAt = new Date();

    return contract.save();
  }

  async cancel(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findOne({
      _id: id,
      $or: [{ clientId: userId }, { freelancerId: userId }],
      deletedAt: null,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (
      contract.status === ContractStatus.COMPLETED ||
      contract.status === ContractStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Contract is already completed or cancelled',
      );
    }

    contract.status = ContractStatus.CANCELLED;
    contract.cancelledAt = new Date();

    return contract.save();
  }

  async findActive(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        status: ContractStatus.ACTIVE,
        deletedAt: null,
      })
      .populate('clientId', 'profile email')
      .populate('freelancerId', 'profile email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findCompleted(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        status: ContractStatus.COMPLETED,
        deletedAt: null,
      })
      .populate('clientId', 'profile email')
      .populate('freelancerId', 'profile email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPending(userId: string): Promise<Contract[]> {
    return this.contractModel
      .find({
        $or: [{ clientId: userId }, { freelancerId: userId }],
        status: ContractStatus.PENDING,
        deletedAt: null,
      })
      .populate('clientId', 'profile email')
      .populate('freelancerId', 'profile email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .exec();
  }

  async sign(id: string, userId: string): Promise<Contract> {
    const contract = await this.contractModel.findOne({
      _id: id,
      $or: [{ clientId: userId }, { freelancerId: userId }],
      deletedAt: null,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.clientId.toString() === userId) {
      contract.isClientSigned = true;
    } else if (contract.freelancerId.toString() === userId) {
      contract.isFreelancerSigned = true;
    } else {
      throw new ForbiddenException(
        'You do not have permission to sign this contract',
      );
    }

    return contract.save();
  }

  async generateAgreement(id: string, userId: string): Promise<Contract> {
    const contract = await this.findOne(id, userId);
    return contract; 
  }
}
